/** Contrat qu'un connecteur de scraping doit respecter (un connecteur par site source). */

export type Availability = "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN";

export type RawProduct = {
  sourceId: string;
  name: string;
  brand?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  price?: number | null;
  promoPrice?: number | null;
  imageUrls: string[];
  categoryPath?: string[];
  availability: Availability;
  sku?: string | null;
  barcode?: string | null;
};

export type ConnectorConfig = {
  /** Clé technique du connecteur, ex. "parapharma.ma" */
  key: string;
  /** Nom affichable */
  name: string;
  baseUrl: string;
  /** Pages de listing à parcourir pour découvrir les produits */
  listUrls: { url: string; pages: number }[];
  /** Motif identifiant une URL produit parmi les liens trouvés */
  productUrlPattern: RegExp;
  /** Délai aléatoire entre requêtes (respect du site source) */
  delayMs: [number, number];
  /** Nombre maximum de produits par exécution */
  maxProductsPerRun: number;
  /** Parseur propre au site */
  parseProduct: ($: import("cheerio").CheerioAPI, url: string) => RawProduct | null;
};

/** Normalise un prix texte marocain ("1 299,00 Dh", "149.00 MAD", "99 dh") vers un nombre. */
export function parseMoroccanPrice(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d,.]/g, "");
  // Une virgule = séparateur décimal → les points deviennent des milliers ("1.299,00" → 1299).
  const hasComma = cleaned.includes(",");
  const normalized = hasComma ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const n = parseFloat(normalized);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

/** Détecte la disponibilité à partir d'un texte. */
export function detectAvailability(text: string | undefined | null): Availability {
  if (!text) return "UNKNOWN";
  const t = text.toLowerCase();
  if (/rupture|indisponible|out of stock|épuisé|epuise|non disponible/.test(t)) return "OUT_OF_STOCK";
  if (/stock|disponible|en stock|add to cart|ajouter au panier|commander/.test(t)) return "IN_STOCK";
  return "UNKNOWN";
}
