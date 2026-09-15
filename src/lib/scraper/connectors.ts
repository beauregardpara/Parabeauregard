import * as cheerio from "cheerio";
import {
  type ConnectorConfig,
  type RawProduct,
  parseMoroccanPrice,
  detectAvailability,
} from "./types";

const text = ($: cheerio.CheerioAPI, selectors: string[]) => {
  for (const s of selectors) {
    const v = $(s).first().text().trim();
    if (v) return v;
  }
  return null;
};

const attr = ($: cheerio.CheerioAPI, selectors: string[], attribute = "src") => {
  for (const s of selectors) {
    const el = $(s).first();
    const v =
      el.attr(attribute) ??
      el.attr(`data-${attribute}`) ??
      el.attr("data-src") ??
      el.attr("data-large_image") ??
      el.attr("content");
    if (v) return v.trim();
  }
  return null;
};

function collectGalleryImages($: cheerio.CheerioAPI, selectors: string[], baseUrl: string): string[] {
  const out: string[] = [];
  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const node = $(el);
      const url =
        node.attr("src") ??
        node.attr("data-src") ??
        node.attr("data-large_image") ??
        node.attr("data-zoom-image") ??
        node.attr("href");
      if (url && !out.includes(url) && !url.includes("default") && !url.includes("themes/")) {
        try {
          out.push(new URL(url, baseUrl).toString());
        } catch {}
      }
    });
    if (out.length >= 5) break;
  }
  return out.slice(0, 5);
}

/** ── Connecteur parapharma.ma (bloqué par Cloudflare → supprimé) ─── */
// parapharma.ma retourne 401 sur toutes les pages → connecteur retiré

/** ── Connecteur mapara.ma (PrestaShop) ──────────────────────────────── */
const mapara: ConnectorConfig = {
  key: "mapara.ma",
  name: "Mapara.ma",
  baseUrl: "https://mapara.ma",
  listUrls: [
    { url: "https://mapara.ma/705-visage", pages: 2 },
    { url: "https://mapara.ma/906-complements-alimentaires", pages: 2 },
  ],
  productUrlPattern: /\/[\w-]+\/\d+-[\w-]+\.html/i,
  delayMs: [900, 1800],
  maxProductsPerRun: 40,
  parseProduct($, url): RawProduct | null {
    const name = text($, ["h1[itemprop=name]", "h1.product-title", "h1"]);
    if (!name) return null;
    const rawId = url.match(/\/(\d+)-[\w-]+\.html/i)?.[1];
    const price = parseMoroccanPrice(
      text($, ["span.price[itemprop=price]", ".current-price .price", "span.price"]) ??
        attr($, ["meta[itemprop=price]"], "content")
    );
    const oldPrice = parseMoroccanPrice(text($, ["span.regular-price", "del span.price", ".old-price"]));

    // Images: essayer d'abord itemprop, puis og:image, puis la galerie
    const mainImage = attr($, ["img[itemprop='image']", "meta[property='og:image']"]);
    const galleryImages = collectGalleryImages($, [
      ".pro_gallery_item img",
      ".product-cover img",
      "#thumb_1 img",
      ".product-images img",
    ], url);

    const allImages = mainImage ? [mainImage, ...galleryImages.filter(u => u !== mainImage)] : galleryImages;

    return {
      sourceId: rawId ?? `mp-${Buffer.from(name).toString("base64url").slice(0, 14)}`,
      name,
      brand: text($, ["a.brand-link strong", "[itemprop=brand]", "meta[property='product:brand']"]),
      description: text($, ["#description", ".product-description", "[itemprop=description]"]),
      shortDescription: text($, ["#short_description_content", ".product-subtitle"]),
      price,
      promoPrice: oldPrice != null && price != null && oldPrice > price ? oldPrice : null,
      imageUrls: allImages,
      availability: detectAvailability(
        text($, ["#availability", ".availability", "span.in-stock", "span.out-of-stock"])
      ),
      sku: text($, ["[itemprop=sku]", ".reference"]),
      barcode: null,
    };
  },
};

/** ── Connecteur phbeauty.ma (WooCommerce) ───────────────────────────── */
const phbeauty: ConnectorConfig = {
  key: "phbeauty.ma",
  name: "Para Health & Beauty",
  baseUrl: "https://phbeauty.ma",
  listUrls: [
    { url: "https://phbeauty.ma/shop/", pages: 2 },
  ],
  productUrlPattern: /\/produit\/[\w-]+\/?$/i,
  delayMs: [1000, 2000],
  maxProductsPerRun: 40,
  parseProduct($, url): RawProduct | null {
    const name = text($, ["h1.product_title", "h1.product-title", "h1"]);
    if (!name) return null;
    const amounts = $("p.price ins .woocommerce-Price-amount, p.price .woocommerce-Price-amount")
      .map((_, el) => $(el).text())
      .get();
    const regular = parseMoroccanPrice(text($, ["p.price del .woocommerce-Price-amount", "p.price del bdi"]));
    const current = parseMoroccanPrice(amounts[amounts.length - 1] ?? null) ?? parseMoroccanPrice(attr($, ["meta[property='product:price:amount']"], "content"));
    const stockText = text($, ["p.stock", ".stock", "meta[property='product:availability']"]);

    // Images WooCommerce: galerie principale + thumbnails
    const mainImage = attr($, [
      "meta[property='og:image']",
      "img.wp-post-image",
      "figure.woocommerce-product-gallery__wrapper img",
    ]);
    const galleryImages = collectGalleryImages($, [
      ".woocommerce-product-gallery img",
      "figure.woocommerce-product-gallery__wrapper img",
    ], url);

    const allImages = mainImage ? [mainImage, ...galleryImages.filter(u => u !== mainImage)] : galleryImages;

    return {
      sourceId:
        attr($, ["button.single_add_to_cart_button"], "value") ??
        `phb-${Buffer.from(name).toString("base64url").slice(0, 14)}`,
      name,
      brand: text($, ["span.posted_in a", "meta[property='product:brand']"]),
      description: text($, ["div.woocommerce-Tabs-panel--description", "#tab-description"]),
      shortDescription: text($, ["div.woocommerce-product-details__short-description", ".short-description"]),
      price: current,
      promoPrice: regular != null && current != null && regular > current ? regular : null,
      imageUrls: allImages,
      availability: detectAvailability(stockText),
      sku: text($, ["span.sku"]),
      barcode: null,
    };
  },
};

/** ── Connecteur universparadiscount.ma (PrestaShop) ─────────────────── */
const universparadiscount: ConnectorConfig = {
  key: "universparadiscount.ma",
  name: "Univers ParaDiscount",
  baseUrl: "https://universparadiscount.ma",
  listUrls: [
    // Visage & Corps
    { url: "https://universparadiscount.ma/4-visage?resultsPerPage=200", pages: 5 },
    { url: "https://universparadiscount.ma/5-corps?resultsPerPage=200", pages: 5 },
    { url: "https://universparadiscount.ma/499-visage-et-corps?resultsPerPage=200", pages: 3 },
    // Cheveux
    { url: "https://universparadiscount.ma/6-cheveux?resultsPerPage=200", pages: 5 },
    { url: "https://universparadiscount.ma/505-cheveux?resultsPerPage=200", pages: 3 },
    // Hygiène
    { url: "https://universparadiscount.ma/10-hygiene?resultsPerPage=200", pages: 5 },
    { url: "https://universparadiscount.ma/501-hygiene-homme?resultsPerPage=200", pages: 2 },
    // Santé
    { url: "https://universparadiscount.ma/471-sante?resultsPerPage=200", pages: 3 },
    { url: "https://universparadiscount.ma/689-minceur?resultsPerPage=200", pages: 2 },
    // Compléments
    { url: "https://universparadiscount.ma/13-complements-alimentaires?resultsPerPage=200", pages: 5 },
    { url: "https://universparadiscount.ma/376-vitamines-et-formes?resultsPerPage=200", pages: 3 },
    // Solaire
    { url: "https://universparadiscount.ma/12-solaire?resultsPerPage=200", pages: 3 },
    // Maquillage
    { url: "https://universparadiscount.ma/237-maquillage-makeup?resultsPerPage=200", pages: 3 },
    // Bébé
    { url: "https://universparadiscount.ma/8-bebes-et-mamans?resultsPerPage=200", pages: 5 },
    // Dentaire
    { url: "https://universparadiscount.ma/331-bucco-dentaire?resultsPerPage=200", pages: 3 },
    // Bio
    { url: "https://universparadiscount.ma/540-bio-et-naturel?resultsPerPage=200", pages: 3 },
    // Homme
    { url: "https://universparadiscount.ma/492-homme?resultsPerPage=200", pages: 3 },
    // Dermocosmétique
    { url: "https://universparadiscount.ma/865-dermocosmetique?resultsPerPage=200", pages: 3 },
    // Produits américains
    { url: "https://universparadiscount.ma/198-produits-americains?resultsPerPage=200", pages: 3 },
    // Aromathérapie
    { url: "https://universparadiscount.ma/403-aromatherapie?resultsPerPage=200", pages: 2 },
    // Entretien
    { url: "https://universparadiscount.ma/679-entretien-de-la-maison?resultsPerPage=200", pages: 2 },
    // Accessoires santé
    { url: "https://universparadiscount.ma/498-accessoires-de-sante?resultsPerPage=200", pages: 2 },
    // Bons deals
    { url: "https://universparadiscount.ma/428-les-bons-deals?resultsPerPage=200", pages: 3 },
    // Confiseries
    { url: "https://universparadiscount.ma/470-confiseries?resultsPerPage=200", pages: 2 },
    // Coreens
    { url: "https://universparadiscount.ma/863-produits-coreens?resultsPerPage=200", pages: 2 },
    // Rasage
    { url: "https://universparadiscount.ma/734-rasage-et-barbe?resultsPerPage=200", pages: 2 },
  ],
  productUrlPattern: /\/[\w-]+\/\d+-[\w-]+\.html/i,
  delayMs: [600, 1200],
  maxProductsPerRun: 500,
  parseProduct($, _url): RawProduct | null {
    const name = text($, ["h1[itemprop=name]", "h1.product-title", "h1"]);
    if (!name) return null;
    const rawId = _url.match(/\/(\d+)-[\w-]+\.html/i)?.[1];

    // ── Prix (PrestaShop) ─────────────────────────────────────────────
    // Structure du site :
    //   <div class="product-price [has-discount]">
    //     <div class="current-price">
    //       [<span class="product-discount"><span class="regular-price">1 080,00 MAD</span></span>]  ← prix d'origine (réduction)
    //       <span class="current-price-value" content="410.85"> 410,85 MAD </span>                  ← prix actuel vendu
    //     </div>
    //   </div>
    // ⚠️ Ne PAS utiliser "span.price" : la page contient aussi les prix de
    //    produits en cross-sell/suggestions, ce qui fausse l'extraction.
    const currentPriceValue =
      parseMoroccanPrice(attr($, ["span.current-price-value"], "content")) ??
      parseMoroccanPrice(text($, ["span.current-price-value"]));

    // Prix d'origine (présent uniquement s'il y a une réduction)
    const regularPrice = parseMoroccanPrice(text($, [".product-prices .current-price .regular-price"]));

    // Fallback : prix proposé dans le JSON-LD (généré par PrestaShop)
    let jsonLdPrice: number | null = null;
    const jsonLdMatches = $.html().match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const block of jsonLdMatches) {
      const inner = block.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");
      const m = inner.match(/"price"\s*:\s*"([\d.]+)"/);
      if (m) {
        const n = parseFloat(m[1]);
        if (Number.isFinite(n)) {
          jsonLdPrice = Math.round(n * 100) / 100;
          break;
        }
      }
    }

    // Convention du catalogue : price = prix d'origine (barré), promoPrice = prix soldé (plus bas).
    // - Avec réduction : regular-price = prix d'origine, current-price-value = prix actuel vendu.
    // - Sans réduction : seul current-price-value existe (= prix normal).
    const current = currentPriceValue ?? jsonLdPrice ?? null;
    const price = regularPrice && current != null && regularPrice > current ? regularPrice : current;
    let promoPrice: number | null = null;
    if (current != null && price != null && current < price) {
      promoPrice = current;
    }

    // Images : PrestaShop les met dans les <script> tags (pas dans <img>)
    // Pattern : /ID-large_default/name.jpg et /ID-home_default/name.jpg
    const html = $.html();
    const imageUrls: string[] = [];

    // 1. og:image
    const ogImage = $("meta[property='og:image']").attr("content");
    if (ogImage) imageUrls.push(ogImage);

    // 2. Images dans les scripts (PrestaShop les charge via JS)
    const scriptImgRegex = /https?:\/\/[^"'\s]+-(?:large|home|medium)_default\/[^"'\s]+\.(?:jpg|jpeg|png|webp)/gi;
    const scriptMatches = html.match(scriptImgRegex) || [];
    for (const imgUrl of scriptMatches) {
      if (!imageUrls.includes(imgUrl)) imageUrls.push(imgUrl);
    }

    // 3. Fallback : images normales
    if (imageUrls.length === 0) {
      const mainImage = attr($, ["img[itemprop='image']", ".product-cover img"]);
      if (mainImage) imageUrls.push(mainImage);
      const gallery = collectGalleryImages($, [
        ".product-cover img",
        ".product-images img",
        "#thumb_1 img",
      ], _url);
      for (const g of gallery) {
        if (!imageUrls.includes(g)) imageUrls.push(g);
      }
    }

    // Catégorie depuis l'URL : /category-name/ID-name.html → category-name
    const categoryFromUrl = _url.replace("https://universparadiscount.ma/", "").split("/")[0] || null;

    return {
      sourceId: rawId ?? `upd-${Buffer.from(name).toString("base64url").slice(0, 14)}`,
      name,
      brand: text($, ["a.brand-link strong", "[itemprop=brand]", "meta[property='product:brand']"]) ??
             name.split(" ").slice(0, 2).join(" "),
      description: text($, ["#description", ".product-description", "[itemprop=description]"]),
      shortDescription: text($, ["#short_description_content", ".product-subtitle"]),
      price,
      promoPrice,
      imageUrls: imageUrls.slice(0, 5),
      availability: detectAvailability(
        text($, ["#availability", ".availability", "span.in-stock", "span.out-of-stock", ".product-availability"]) ??
          $(".add-to-cart, button[data-button-action=add-to-cart]").text()
      ),
      sku: text($, ["[itemprop=sku]", ".product-reference"]),
      barcode: null,
      categoryPath: categoryFromUrl ? [categoryFromUrl] : undefined,
    };
  },
};

export const CONNECTORS: Record<string, ConnectorConfig> = {
  [mapara.key]: mapara,
  [phbeauty.key]: phbeauty,
  [universparadiscount.key]: universparadiscount,
};

export function getConnector(key: string): ConnectorConfig | undefined {
  return CONNECTORS[key];
}

export function connectorKeys(): string[] {
  return Object.keys(CONNECTORS);
}
