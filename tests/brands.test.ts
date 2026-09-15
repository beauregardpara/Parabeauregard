import { describe, it, expect } from "vitest";
import { normalizeBrand, knownBrands } from "../src/lib/brands";

describe("normalizeBrand", () => {
  it("ramène les alias connus au nom canonique", () => {
    expect(normalizeBrand("LA ROCHE")).toBe("La Roche-Posay");
    expect(normalizeBrand("La Roche-Posay")).toBe("La Roche-Posay");
    expect(normalizeBrand("ROGER ET")).toBe("Roger & Gallet");
    expect(normalizeBrand("A-DERMA")).toBe("A-Derma");
    expect(normalizeBrand("ADERMA EXOMEGA")).toBe("A-Derma");
  });

  it("retire la gamme accolée à la marque", () => {
    expect(normalizeBrand("AVENE CICALFATE+")).toBe("Avène");
    expect(normalizeBrand("CERAVE CREME")).toBe("CeraVe");
    expect(normalizeBrand("VICHY DERCOS")).toBe("Vichy");
    expect(normalizeBrand("NUXE MEN")).toBe("Nuxe");
  });

  it("conserve les marques multi-mots du référentiel", () => {
    expect(normalizeBrand("PANIER DES")).toBe("Panier des Sens");
    expect(normalizeBrand("IDC INSTITUTE")).toBe("IDC Institute");
    expect(normalizeBrand("SEXY HAIR")).toBe("Sexy Hair");
  });

  it("rejette les libellés qui ne sont pas des marques", () => {
    expect(normalizeBrand("Hydratation corps")).toBeNull();
    expect(normalizeBrand("Acné & Imperfections")).toBeNull();
    expect(normalizeBrand("Nettoyants & Démaquillants")).toBeNull();
    expect(normalizeBrand("  ")).toBeNull();
    expect(normalizeBrand(null)).toBeNull();
    expect(normalizeBrand("12")).toBeNull();
  });

  it("rejette les noms de catégories injectés dynamiquement", () => {
    expect(normalizeBrand("Soins ciblés", { extraNonBrands: ["Soins ciblés"] })).toBeNull();
    // Sans injection, le repli garde le premier mot.
    expect(normalizeBrand("Soins ciblés")).toBeNull();
  });

  it("titre-case les marques inconnues sur leur premier mot", () => {
    expect(normalizeBrand("YAZINE FRESH")).toBe("Yazine");
    expect(normalizeBrand("botanika gel")).toBe("Botanika");
  });

  it("est idempotent", () => {
    for (const brand of knownBrands()) {
      expect(normalizeBrand(brand)).toBe(brand);
    }
  });
});
