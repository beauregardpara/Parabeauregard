/**
 * Normalise les marques ET les libellés produits du catalogue existant.
 *
 * Les produits importés avant l'introduction de `src/lib/brands.ts` portent des
 * libellés bruts (« AVENE CICALFATE », « CERAVE CREME », « Hydratation corps »).
 * Ce script les ramène au référentiel canonique.
 *
 *   npm run brands:normalize          → aperçu (aucune écriture)
 *   npm run brands:normalize -- --write → applique les changements
 */
import { PrismaClient } from "@prisma/client";
import { normalizeBrand } from "../lib/brands";
import { formatProductName, productSlugSource, buildSearchText } from "../lib/product-name";
import { slugify } from "../lib/format";
import { cleanDescription } from "../lib/product-description";

const db = new PrismaClient();
const WRITE = process.argv.includes("--write");
/**
 * Reprise des slugs (opt-in) : les anciens produits portent un slug où la
 * marque est répétée (« guinot-gel-guinot-gel-nettoyant… »). Cette reprise
 * change les URLs publiques : à n'exécuter qu'avant une mise en ligne.
 */
const SLUGS = process.argv.includes("--slugs");

async function main() {
  // Les noms de catégories réels servent à rejeter les faux libellés de marque.
  const categories = await db.category.findMany({ select: { name: true } });
  const extraNonBrands = categories.map((c) => c.name);

  const products = await db.product.findMany({
    select: {
      id: true, brand: true, name: true, slug: true,
      description: true, shortDescription: true, searchText: true,
    },
  });
  const takenSlugs = new Set(products.map((p) => p.slug));

  const changes = new Map<string, { to: string | null; count: number }>();
  let updated = 0;
  let cleared = 0;

  let renamed = 0;
  let reslugged = 0;
  let cleanedDescriptions = 0;
  let reindexed = 0;
  for (const p of products) {
    const next = normalizeBrand(p.brand, { extraNonBrands });

    // Libellé : casse de titre + écriture officielle de la marque en préfixe.
    const nextName = formatProductName(p.name, next);
    if (nextName && nextName !== p.name) {
      renamed += 1;
      if (WRITE) await db.product.update({ where: { id: p.id }, data: { name: nextName } });
    }

    // Descriptions : retrait des fragments d'interface des sites sources.
    const nextDesc = cleanDescription(p.description);
    const nextShort = cleanDescription(p.shortDescription);
    if (nextDesc !== p.description || nextShort !== p.shortDescription) {
      cleanedDescriptions += 1;
      if (WRITE) {
        await db.product.update({
          where: { id: p.id },
          data: { description: nextDesc, shortDescription: nextShort },
        });
      }
    }

    // Index de recherche replié (sans accents) : « avene » doit trouver « Avène ».
    const nextSearch = buildSearchText([nextName || p.name, next]);
    if (nextSearch !== p.searchText) {
      reindexed += 1;
      if (WRITE) await db.product.update({ where: { id: p.id }, data: { searchText: nextSearch } });
    }

    if (SLUGS) {
      const base = slugify(productSlugSource(nextName || p.name, next)).slice(0, 80);
      if (base && base !== p.slug) {
        // Unicité : on suffixe si le slug cible est déjà pris par un autre produit.
        let candidate = base;
        for (let i = 2; takenSlugs.has(candidate); i++) candidate = `${base}-${i}`;
        takenSlugs.delete(p.slug);
        takenSlugs.add(candidate);
        reslugged += 1;
        if (WRITE) await db.product.update({ where: { id: p.id }, data: { slug: candidate } });
      }
    }

    if (next === p.brand) continue;

    const key = p.brand ?? "";
    const entry = changes.get(key) ?? { to: next, count: 0 };
    entry.count += 1;
    changes.set(key, entry);

    if (next === null) cleared += 1;
    else updated += 1;

    if (WRITE) {
      await db.product.update({ where: { id: p.id }, data: { brand: next } });
    }
  }

  const sorted = [...changes.entries()].sort((a, b) => b[1].count - a[1].count);
  for (const [from, { to, count }] of sorted) {
    process.stdout.write(`${from}  →  ${to ?? "(marque retirée)"}   [${count}]\n`);
  }

  const distinctBefore = new Set(products.map((p) => p.brand).filter(Boolean)).size;
  const distinctAfter = new Set(
    products.map((p) => normalizeBrand(p.brand, { extraNonBrands })).filter(Boolean)
  ).size;

  process.stdout.write(
    `\n${WRITE ? "✔ Appliqué" : "▶ Aperçu (utilisez --write pour appliquer)"} :\n` +
      `  ${updated} marque(s) corrigée(s), ${cleared} libellé(s) non-marque retiré(s)\n` +
      `  ${renamed} nom(s) de produit reformaté(s)\n` +
      `  ${cleanedDescriptions} description(s) nettoyée(s)\n` +
      `  ${reindexed} produit(s) réindexé(s) pour la recherche\n` +
      (SLUGS ? `  ${reslugged} slug(s) réécrit(s)\n` : "") +
      `  marques distinctes : ${distinctBefore} → ${distinctAfter}\n`
  );
}

main()
  .catch((err) => {
    process.exitCode = 1;
    process.stderr.write(`Échec : ${(err as Error).message}\n`);
  })
  .finally(() => db.$disconnect());
