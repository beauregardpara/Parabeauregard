import { foldForSearch } from "@/lib/product-name";

/**
 * Filtres de la liste produits de l'administration.
 *
 * Source unique : la page ET l'action groupée « tout sélectionner » lisent ce
 * même constructeur. Sans cela, une sélection portant sur « tous les produits
 * du filtre » pourrait agir sur d'autres produits que ceux affichés.
 */
export type AdminProductFilters = {
  statut?: string;
  source?: string;
  q?: string;
  marque?: string;
  categorie?: string;
  stock?: string;
  promo?: string;
};

/** Champs transmis au formulaire d'actions groupées (ordre stable). */
export const ADMIN_PRODUCT_FILTER_KEYS = [
  "statut",
  "source",
  "q",
  "marque",
  "categorie",
  "stock",
  "promo",
] as const satisfies readonly (keyof AdminProductFilters)[];

const STATUSES = new Set(["PUBLISHED", "PENDING_REVIEW", "HIDDEN"]);

export function buildAdminProductWhere(
  filters: AdminProductFilters,
  lowStockThreshold: number
): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filters.statut === "RUPTURE") {
    where.status = "PUBLISHED";
    where.stock = 0;
    where.unlimitedStock = false;
  } else if (filters.statut && STATUSES.has(filters.statut)) {
    where.status = filters.statut;
  }

  if (filters.source) where.sourceName = filters.source;

  if (filters.q) {
    // PostgreSQL compare les LIKE en respectant la casse et les accents : on
    // cherche aussi dans le texte replié (« avene » trouve « Avène »).
    const q = filters.q.trim();
    const folded = foldForSearch(q);
    const id = /^\d+$/.test(q) ? Number(q) : null;
    where.OR = [
      ...(folded ? [{ searchText: { contains: folded } }, { slug: { contains: folded.replace(/\s+/g, "-") } }] : []),
      { name: { contains: q } },
      { sku: { contains: q } },
      { brand: { contains: q } },
      ...(id ? [{ id }] : []),
    ];
  }

  if (filters.marque) where.brand = filters.marque;

  if (filters.categorie) {
    const categoryId = Number(filters.categorie);
    if (Number.isInteger(categoryId) && categoryId > 0) where.categoryId = categoryId;
  }

  if (filters.stock === "faible") {
    where.stock = { lte: lowStockThreshold, gt: 0 };
    where.unlimitedStock = false;
  }
  if (filters.stock === "rupture") {
    where.stock = 0;
    where.unlimitedStock = false;
  }

  if (filters.promo === "oui") where.promoPrice = { not: null };

  return where;
}

/** Ne garde que les filtres réellement renseignés (pour les champs cachés du formulaire). */
export function pickAdminProductFilters(sp: Record<string, string | undefined>): AdminProductFilters {
  const out: AdminProductFilters = {};
  for (const key of ADMIN_PRODUCT_FILTER_KEYS) {
    const value = sp[key]?.trim();
    if (value) out[key] = value;
  }
  return out;
}
