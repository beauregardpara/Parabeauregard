import { describe, expect, it } from "vitest";
import {
  ADMIN_PRODUCT_FILTER_KEYS,
  buildAdminProductWhere,
  pickAdminProductFilters,
} from "@/lib/admin/product-filters";
import { bulkProductSchema } from "@/lib/validation/schemas";

describe("filtres de la liste produits (admin)", () => {
  it("sans filtre, ne restreint rien", () => {
    expect(buildAdminProductWhere({}, 3)).toEqual({});
  });

  it("filtre par statut", () => {
    expect(buildAdminProductWhere({ statut: "PENDING_REVIEW" }, 3)).toEqual({ status: "PENDING_REVIEW" });
  });

  it("ignore un statut inconnu plutôt que de l'injecter tel quel", () => {
    expect(buildAdminProductWhere({ statut: "TOUT" }, 3)).toEqual({});
  });

  it("traduit RUPTURE en produits publiés à stock nul", () => {
    expect(buildAdminProductWhere({ statut: "RUPTURE" }, 3)).toEqual({
      status: "PUBLISHED",
      stock: 0,
      unlimitedStock: false,
    });
  });

  it("applique le seuil de stock faible fourni", () => {
    expect(buildAdminProductWhere({ stock: "faible" }, 7)).toMatchObject({ stock: { lte: 7, gt: 0 } });
  });

  it("ignore une catégorie non numérique", () => {
    expect(buildAdminProductWhere({ categorie: "abc" }, 3)).toEqual({});
    expect(buildAdminProductWhere({ categorie: "12" }, 3)).toEqual({ categoryId: 12 });
  });

  it("cherche aussi dans le texte replié pour les accents", () => {
    const where = buildAdminProductWhere({ q: "avene" }, 3) as { OR: Record<string, unknown>[] };
    expect(where.OR.some((c) => "searchText" in c)).toBe(true);
    expect(where.OR.some((c) => "name" in c)).toBe(true);
  });

  it("ne retient que les filtres renseignés", () => {
    expect(pickAdminProductFilters({ statut: "PUBLISHED", q: "   ", marque: "Avène" })).toEqual({
      statut: "PUBLISHED",
      marque: "Avène",
    });
  });
});

describe("action groupée : portée de la sélection", () => {
  const base = { bulkAction: "publish" as const };

  it("refuse une sélection de page vide", () => {
    expect(bulkProductSchema.safeParse({ ...base, ids: [], scope: "page" }).success).toBe(false);
  });

  it("accepte une portée « tout le filtre » sans identifiants", () => {
    const parsed = bulkProductSchema.safeParse({
      ...base,
      ids: [],
      scope: "filtered",
      filters: { statut: "PENDING_REVIEW" },
      expectedCount: 241,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.scope).toBe("filtered");
      expect(parsed.data.expectedCount).toBe(241);
    }
  });

  it("retombe sur la page quand la portée n'est pas précisée", () => {
    const parsed = bulkProductSchema.safeParse({ ...base, ids: [1, 2] });
    expect(parsed.success && parsed.data.scope).toBe("page");
  });

  it("rejette une portée inventée", () => {
    expect(bulkProductSchema.safeParse({ ...base, ids: [1], scope: "tout" }).success).toBe(false);
  });

  it("transporte exactement les filtres de la liste", () => {
    // Si un filtre de la liste n'est pas transmis, « tout le filtre » agirait
    // sur des produits que l'utilisateur ne voyait pas.
    const parsed = bulkProductSchema.safeParse({
      ...base,
      ids: [],
      scope: "filtered",
      filters: Object.fromEntries(ADMIN_PRODUCT_FILTER_KEYS.map((k) => [k, "x"])),
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(Object.keys(parsed.data.filters).sort()).toEqual([...ADMIN_PRODUCT_FILTER_KEYS].sort());
  });
});
