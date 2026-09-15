import { describe, expect, it } from "vitest";
import { adminProductSchema } from "../src/lib/validation/schemas";

const validProduct = {
  name: "Sérum test",
  slug: "serum-test",
  sku: "QA-SERUM-001",
  brand: "Marque test",
  categoryId: 1,
  shortDescription: "Description courte",
  description: "Description complète",
  price: 120,
  promoPrice: 99,
  stock: 5,
  lowStockThreshold: 2,
  unlimitedStock: false,
  isFeatured: false,
  status: "PENDING_REVIEW" as const,
};

describe("adminProductSchema", () => {
  it("valide les champs d’un produit admin", () => {
    expect(adminProductSchema.safeParse(validProduct).success).toBe(true);
  });

  it("refuse un stock négatif", () => {
    expect(adminProductSchema.safeParse({ ...validProduct, stock: -1 }).success).toBe(false);
  });

  it("refuse un slug non canonique", () => {
    expect(adminProductSchema.safeParse({ ...validProduct, slug: "Serum Test" }).success).toBe(false);
  });

  it("refuse une promotion supérieure au prix", () => {
    expect(adminProductSchema.safeParse({ ...validProduct, promoPrice: 121 }).success).toBe(false);
  });
});
