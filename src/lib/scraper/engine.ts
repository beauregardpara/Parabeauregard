import { slugify } from "@/lib/format";
import { normalizeBrand } from "@/lib/brands";
import { formatProductName, productSlugSource, buildSearchText } from "@/lib/product-name";
import { cleanDescription } from "@/lib/product-description";
import { db } from "@/lib/db";
import { SETTING_KEYS } from "@/lib/settings";
import { getConnector, connectorKeys } from "./connectors";
import { isAllowedByRobots, politeFetch, downloadImage, searchProductImages, searchGoogleImages } from "./http";
import { syncProductQuality } from "./quality";
import { notifyStockAlerts } from "@/lib/product-alerts";
import { logger } from "@/lib/logger";
import type { RawProduct } from "./types";

type RunLogger = (line: string) => void;

async function collectProductUrls(
  connector: ReturnType<typeof getConnector>,
  robots: Awaited<ReturnType<typeof isAllowedByRobots>>,
  log: RunLogger
): Promise<string[]> {
  if (!connector) return [];
  const urls = new Set<string>();

  for (const list of connector.listUrls) {
    if (!robots.isAllowed(list.url)) {
      log(`[robots] listing bloqué par robots.txt : ${list.url}`);
      continue;
    }
    for (let page = 1; page <= list.pages; page++) {
      const sep = list.url.includes("?") ? "&" : "?";
      const pageUrl = page === 1 ? list.url : `${list.url}${sep}page=${page}`;
      if (!robots.isAllowed(pageUrl)) {
        log(`[robots] page bloquée par robots.txt : ${pageUrl}`);
        continue;
      }
      try {
        const $ = await politeFetch(pageUrl, connector.delayMs);
        let foundOnPage = 0;
        $("a[href]").each((_, el) => {
          const href = $(el).attr("href");
          if (!href) return;
          const absolute = new URL(href, connector.baseUrl).toString();
          const sameOrigin = new URL(absolute).origin === new URL(connector.baseUrl).origin;
          if (!sameOrigin) return;
          const path = new URL(absolute).pathname;
          if (connector.productUrlPattern.test(path)) {
            const clean = new URL(absolute);
            clean.hash = "";
            clean.search = "";
            const cleanUrl = clean.toString();
            if (!robots.isAllowed(cleanUrl)) {
              log(`[robots] produit bloqué par robots.txt : ${cleanUrl}`);
              return;
            }
            urls.add(cleanUrl);
            foundOnPage++;
          }
        });
        log(`[liste] ${pageUrl} → ${foundOnPage} liens produit détectés`);
      } catch (err) {
        log(`[erreur] listing ${pageUrl} : ${(err as Error).message}`);
      }
    }
  }

  return [...urls].slice(0, connector.maxProductsPerRun);
}

async function mapCategory(path: string[] | undefined): Promise<number | null> {
  if (!path?.length) return null;
  const categories = await db.category.findMany();
  for (let i = path.length - 1; i >= 0; i--) {
    const match = categories.find(
      (c) =>
        c.name.toLowerCase() === path[i].toLowerCase().trim() ||
        c.slug === slugify(path[i])
    );
    if (match) return match.id;
  }
  return null;
}

/**
 * Télécharge toutes les images d'un produit.
 * Si aucune image n'est trouvée sur la source, cherche sur le web.
 * Retourne les URLs locales des images téléchargées.
 */
async function resolveProductImages(
  raw: RawProduct,
  baseUrl: string,
  log: RunLogger
): Promise<string[]> {
  const localUrls: string[] = [];

  // 1. Essayer de télécharger les images de la source
  for (let i = 0; i < raw.imageUrls.length; i++) {
    const url = raw.imageUrls[i];
    try {
      const local = await downloadImage(url, baseUrl);
      if (local) {
        localUrls.push(local);
        log(`  [image ${i + 1}/${raw.imageUrls.length}] téléchargée → ${local}`);
      } else {
        log(`  [image ${i + 1}/${raw.imageUrls.length}] invalide → ${url}`);
      }
    } catch (err) {
      log(`  [image ${i + 1}/${raw.imageUrls.length}] erreur : ${(err as Error).message}`);
    }
  }

  // 2. Si aucune image valide trouvée, chercher sur le web
  if (localUrls.length === 0) {
    const searchQuery = [raw.brand, raw.name].filter(Boolean).join(" ");
    log(`  [image-web] recherche pour "${searchQuery}"...`);

    // Essai 1 : DuckDuckGo
    const ddgImages = await searchProductImages(searchQuery);
    for (const imgUrl of ddgImages) {
      const local = await downloadImage(imgUrl);
      if (local) {
        localUrls.push(local);
        log(`  [image-web] DuckDuckGo → ${local}`);
        break;
      }
    }

    // Essai 2 : Google Images si DuckDuckGo a échoué
    if (localUrls.length === 0) {
      const googleImages = await searchGoogleImages(searchQuery);
      for (const imgUrl of googleImages) {
        const local = await downloadImage(imgUrl);
        if (local) {
          localUrls.push(local);
          log(`  [image-web] Google → ${local}`);
          break;
        }
      }
    }

    if (localUrls.length === 0) {
      log(`  [image-web] aucune image trouvée pour "${searchQuery}"`);
    }
  }

  return localUrls;
}

async function upsertProduct(
  connectorKey: string,
  raw: RawProduct,
  productUrl: string,
  autoPublish: boolean,
  log: RunLogger
): Promise<"added" | "updated" | "skipped" | "error"> {
  try {
    const now = new Date();
    const existing = await db.product.findUnique({
      where: { sourceName_sourceId: { sourceName: connectorKey, sourceId: raw.sourceId } },
      include: { images: true },
    });

    const price = raw.price ?? 0;
    const promoPrice = raw.promoPrice != null && raw.promoPrice < price ? raw.promoPrice : null;
    // Marque ramenée au référentiel canonique (« AVENE CICALFATE » → « Avène »).
    const brand = normalizeBrand(raw.brand);
    // Les sources renvoient des libellés tout en capitales : on les remet en
    // casse de titre, marque officielle en préfixe.
    const name = formatProductName(raw.name, brand) || raw.name;
    // Les fiches sources embarquent des fragments d'interface : on les retire.
    const description = cleanDescription(raw.description);
    const shortDescription =
      cleanDescription(raw.shortDescription) ?? description?.slice(0, 180) ?? null;

    // Politique honnête : jamais d'invention de quantité.
    //  - OUT_OF_STOCK → stock 0
    //  - IN_STOCK → garde le stock réel existant (0 si inconnu) et passe en
    //    "quantité non garantie" (unlimitedStock), l'admin fixe les vrais stocks.
    const isOut = raw.availability === "OUT_OF_STOCK";
    const stock = isOut ? 0 : (existing?.stock ?? 0);
    const unlimitedStock = raw.availability === "IN_STOCK";

    // Résoudre les images uniquement si nécessaires :
    //  - produit nouveau, ou produit existant sans aucune image.
    //  → évite de re-télécharger des milliers d'images à chaque exécution.
    const baseUrl = new URL(productUrl).origin;
    let imageUrls: string[] = [];
    if (!existing || (existing.images?.length ?? 0) === 0) {
      imageUrls = await resolveProductImages(raw, baseUrl, log);
    }

    const categoryId = await mapCategory(raw.categoryPath);

    if (!existing) {
      // Le libellé commence déjà par la marque dans la plupart des sources :
      // on évite « guinot-gel-guinot-gel-nettoyant… ».
      let slug = slugify(productSlugSource(name, brand)).slice(0, 80);
      if (!slug) slug = `produit-${raw.sourceId}`;
      // Générer un slug unique en cas de collision
      let finalSlug = slug;
      for (let attempt = 0; attempt < 5; attempt++) {
        const clash = await db.product.findUnique({ where: { slug: finalSlug } });
        if (!clash) break;
        finalSlug = `${slug}-${slugify(raw.sourceId).slice(0, 10)}${attempt > 0 ? `-${attempt}` : ""}`;
      }

      const created = await db.product.create({
        data: {
          name,
          slug: finalSlug,
          brand,
          searchText: buildSearchText([name, brand]),
          shortDescription,
          description,
          price,
          promoPrice,
          sku: raw.sku ?? null,
          barcode: raw.barcode ?? null,
          status: autoPublish ? "PUBLISHED" : "PENDING_REVIEW",
          stock,
          unlimitedStock,
          categoryId,
          sourceName: connectorKey,
          sourceId: raw.sourceId,
          sourceUrl: productUrl,
          lastScrapedAt: now,
          lastSeenAt: now,
          images: imageUrls.length > 0
            ? { create: imageUrls.map((url, i) => ({ url, order: i })) }
            : undefined,
        },
      });
      // Qualité initiale (non bloquant)
      syncProductQuality(created.id).catch(() => undefined);
      log(`[ajouté] ${raw.name} (${imageUrls.length} image(s))`);
      return "added";
    }

    // Produit existant
    const data: Record<string, unknown> = {};
    let becameAvailable = false;
    data.lastScrapedAt = now;
    data.lastSeenAt = now;
    if (name && name !== existing.name) data.name = name;
    // On ne remplace la marque que si la source en fournit une exploitable :
    // une source muette ne doit jamais effacer une marque déjà connue.
    if (brand && brand !== existing.brand) data.brand = brand;
    const searchText = buildSearchText([name, brand ?? existing.brand]);
    if (searchText !== existing.searchText) data.searchText = searchText;
    if (price !== existing.price && price > 0) {
      data.price = price;
      data._oldPrice = existing.price;
    }
    if (promoPrice !== existing.promoPrice) data.promoPrice = promoPrice;
    // Stock honnête : la source ne fournit pas de quantité réelle.
    // IN_STOCK → produit commandable (unlimitedStock), stock réel jamais inventé.
    // OUT_OF_STOCK → rupture ferme (unlimitedStock=false, stock=0).
    if (isOut) {
      if (existing.unlimitedStock || existing.stock !== 0) {
        data.unlimitedStock = false;
        data.stock = 0;
        data._oldStock = existing.stock;
      }
    } else if (!existing.unlimitedStock) {
      data.unlimitedStock = true;
      becameAvailable = true;
    }
    if (categoryId && !existing.categoryId) data.categoryId = categoryId;
    if (autoPublish && existing.status === "PENDING_REVIEW") data.status = "PUBLISHED";

    // Mettre à jour les images si le produit n'en a pas
    if (existing.images.length === 0 && imageUrls.length > 0) {
      await db.productImage.deleteMany({ where: { productId: existing.id } });
      await db.productImage.createMany({
        data: imageUrls.map((url, i) => ({ productId: existing.id, url, order: i })),
      });
      log(`  [images] ${imageUrls.length} image(s) ajoutée(s) au produit existant`);
    }

const meaningfulKeys = Object.keys(data).filter(
      (k) => k !== "lastScrapedAt" && k !== "lastSeenAt" && k !== "_oldPrice" && k !== "_oldStock"
    );
    if (meaningfulKeys.length > 0) {
      // Historiques (prix & stock) + mise à jour dans une transaction atomique
      const { _oldPrice, _oldStock, ...updateData } = data;
      await db.$transaction([
        ...(typeof _oldPrice === "number"
          ? [db.priceHistory.create({ data: { productId: existing.id, oldPrice: _oldPrice, newPrice: price, reason: "scraping" } })]
          : []),
        ...(typeof _oldStock === "number"
          ? [db.stockHistory.create({ data: { productId: existing.id, oldStock: _oldStock, newStock: 0, reason: "scraping" } })]
          : []),
        db.product.update({ where: { id: existing.id }, data: updateData }),
      ]);
      log(`[modifié] ${raw.name} (${meaningfulKeys.join(", ")})`);
      // Qualité : resynchroniser le score du produit après modification (non bloquant)
      syncProductQuality(existing.id).catch(() => undefined);
      if (becameAvailable) {
        // Retour de stock : notifier les clients qui attendaient ce produit (non bloquant)
        notifyStockAlerts(existing.id).catch(() => undefined);
      }
      return "updated";
    }

    await db.product.update({ where: { id: existing.id }, data: { lastScrapedAt: now, lastSeenAt: now } });
    if (becameAvailable) {
      // Retour de stock : notifier les clients qui attendaient ce produit (non bloquant)
      notifyStockAlerts(existing.id).catch(() => undefined);
    }
    return "skipped";
  } catch (err) {
    log(`[erreur] ${raw?.name ?? "?"} : ${(err as Error).message}`);
    return "error";
  }
}

export type ScrapeResult = {
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  addedCount: number;
  updatedCount: number;
  missingCount: number;
  errorCount: number;
  runId: number;
};

/**
 * Au-delà de cette durée, une exécution encore marquée « RUNNING » est
 * considérée comme abandonnée (processus tué, redémarrage du serveur).
 * Sans ce délai, un run fantôme bloquerait définitivement la source.
 */
const STALE_RUN_MS = 6 * 60 * 60 * 1000;

/**
 * Renvoie l'exécution réellement en cours pour une source, ou `null`.
 * Les exécutions fantômes sont clôturées en `FAILED` au passage.
 */
export async function findActiveRun(sourceName: string): Promise<{ id: number } | null> {
  const running = await db.scrapeRun.findFirst({
    where: { sourceName, status: "RUNNING" },
    orderBy: { startedAt: "desc" },
    select: { id: true, startedAt: true },
  });
  if (!running) return null;

  if (Date.now() - running.startedAt.getTime() > STALE_RUN_MS) {
    await db.scrapeRun.update({
      where: { id: running.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        log: "Exécution interrompue : marquée en échec après expiration du délai.",
      },
    });
    return null;
  }
  return { id: running.id };
}

export async function runScrape(connectorKey: string, opts?: { autoPublish?: boolean }): Promise<ScrapeResult> {
  const connector = getConnector(connectorKey);
  if (!connector) throw new Error(`Connecteur inconnu : ${connectorKey}. Disponibles : ${connectorKeys().join(", ")}`);

  // Anti double-exécution : une seule exécution simultanée par source.
  const active = await findActiveRun(connectorKey);
  if (active) throw new Error(`SCRAPE_ALREADY_RUNNING:${active.id}`);

  const logLines: string[] = [];
  const log: RunLogger = (line) => {
    logLines.push(`${new Date().toISOString()} ${line}`);
    console.log(`[${connector.key}] ${line}`);
  };

  const run = await db.scrapeRun.create({
    data: { sourceName: connectorKey, status: "RUNNING", log: "" },
  });

  const startedAt = Date.now();
  logger.info("scraper", "scrape.start", {
    message: `Lancement du scraping ${connectorKey}`,
    data: { connector: connectorKey, runId: run.id },
  });

  let added = 0,
    updated = 0,
    errors = 0;

  try {
    // Paramètre de publication : priorité à l'appelant, sinon réglage admin
    let autoPublish = opts?.autoPublish;
    if (autoPublish == null) {
      const setting = await db.setting.findUnique({
        where: { key: SETTING_KEYS.autoPublish },
        select: { value: true },
      });
      autoPublish = setting?.value === "true";
    }

    const robots = await isAllowedByRobots(connector.baseUrl);
    log(robots.note);
    if (!robots.allowed) {
      log(`FATAL : robots.txt bloque le domaine — scraping abandonné`);
      logger.error("scraper", "scrape.robots_blocked", {
        message: `robots.txt bloque ${connectorKey}`,
        data: { connector: connectorKey, runId: run.id },
      });
      await db.scrapeRun.update({
        where: { id: run.id },
        data: {
          finishedAt: new Date(),
          status: "FAILED",
          errorCount: 1,
          log: logLines.join("\n").slice(0, 60000),
        },
      });
      return { status: "FAILED", addedCount: 0, updatedCount: 0, missingCount: 0, errorCount: 1, runId: run.id };
    }

    const seenIds = new Set<string>();
    const productUrls = await collectProductUrls(connector, robots, log);
    log(`Total URLs produits à traiter : ${productUrls.length}`);

    for (const url of productUrls) {
      if (!robots.isAllowed(url)) {
        log(`[robots] produit bloqué, ignoré : ${url}`);
        continue;
      }
      try {
        const $ = await politeFetch(url, connector.delayMs);
        const raw = connector.parseProduct($, url);
        if (!raw || !raw.name) {
          log(`[ignoré] structure non reconnue sur ${url}`);
          continue;
        }
        raw.sourceId = raw.sourceId || url;
        seenIds.add(raw.sourceId);

        const result = await upsertProduct(connector.key, { ...raw }, url, autoPublish === true, log);
        if (result === "added") added++;
        else if (result === "updated") updated++;
        else if (result === "error") errors++;
      } catch (err) {
        errors++;
        log(`[erreur] produit ${url} : ${(err as Error).message}`);
      }
    }

    const sourceProducts = await db.product.findMany({
      where: { sourceName: connector.key },
      select: { id: true, sourceId: true, name: true },
    });
    let missing = 0;
    for (const p of sourceProducts) {
      const stillThere = seenIds.size === 0 || seenIds.has(p.sourceId ?? "");
      if (!stillThere) {
        log(`[disparu?] ${p.name} absent de cette exécution`);
        missing++;
      }
    }

    const status = errors === 0 ? "SUCCESS" : added + updated + errors > 0 ? "PARTIAL" : "FAILED";
    const finishedRun = await db.scrapeRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        status,
        addedCount: added,
        updatedCount: updated,
        missingCount: missing,
        errorCount: errors,
        log: logLines.join("\n").slice(0, 60000),
      },
    });
    log(`Terminé : +${added} ajoutés, ~${updated} modifiés, ${errors} erreurs`);
    logger.info("scraper", "scrape.finished", {
      message: `Scraping ${connectorKey} → ${status}`,
      errorCode: status === "FAILED" ? "SCRAPE_PARTIAL_OR_FAILED" : undefined,
      durationMs: Date.now() - startedAt,
      data: { connector: connectorKey, runId: finishedRun.id, status, added, updated, missing, errors },
    });

    return {
      status,
      addedCount: added,
      updatedCount: updated,
      missingCount: missing,
      errorCount: errors,
      runId: finishedRun.id,
    };
  } catch (err) {
    log(`FATAL : ${(err as Error).message}`);
    logger.error("scraper", "scrape.failed", {
      message: `Scraping ${connectorKey} en erreur`,
      errorCode: "SCRAPE_FAILED",
      durationMs: Date.now() - startedAt,
      data: {
        connector: connectorKey,
        runId: run.id,
        ...(err instanceof Error ? { error: err.message } : {}),
      },
    });
    await db.scrapeRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        status: "FAILED",
        errorCount: errors + 1,
        log: logLines.join("\n").slice(0, 60000),
      },
    });
    throw err;
  }
}
