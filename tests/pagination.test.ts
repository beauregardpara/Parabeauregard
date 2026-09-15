import { describe, it, expect } from "vitest";
import { paginationItems } from "../src/lib/pagination";

/**
 * La pagination affichait toutes les pages : sur un rayon de 9 pages, la barre
 * mesurait 1096 px et débordait l'écran d'un mobile de 375 px.
 */
describe("paginationItems", () => {
  it("affiche toutes les pages quand elles sont peu nombreuses", () => {
    expect(paginationItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(paginationItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("condense les longues paginations autour de la page courante", () => {
    expect(paginationItems(5, 20)).toEqual([1, "…", 4, 5, 6, "…", 20]);
  });

  it("gère les extrémités sans ellipse superflue", () => {
    expect(paginationItems(1, 20)).toEqual([1, 2, "…", 20]);
    expect(paginationItems(20, 20)).toEqual([1, "…", 19, 20]);
  });

  it("ne dépasse jamais 7 éléments", () => {
    for (let total = 8; total <= 60; total++) {
      for (let current = 1; current <= total; current++) {
        expect(paginationItems(current, total).length).toBeLessThanOrEqual(7);
      }
    }
  });

  it("contient toujours la page courante", () => {
    for (const [current, total] of [[1, 9], [5, 9], [9, 9], [12, 40]] as const) {
      expect(paginationItems(current, total)).toContain(current);
    }
  });
});
