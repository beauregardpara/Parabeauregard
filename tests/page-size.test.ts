import { describe, expect, it } from "vitest";
import {
  ADMIN_PAGE_SIZES,
  ALL_KEYWORD,
  MAX_PAGE_SIZE,
  pageSizeChoices,
  parsePageSize,
  SHOP_PAGE_SIZES,
} from "@/lib/page-size";

describe("nombre d'éléments par page", () => {
  it("retombe sur la valeur par défaut quand le paramètre est absent", () => {
    expect(parsePageSize(undefined, SHOP_PAGE_SIZES, 12)).toMatchObject({ perPage: 12, isAll: false });
  });

  it("accepte une valeur proposée", () => {
    expect(parsePageSize("48", SHOP_PAGE_SIZES, 12)).toMatchObject({ perPage: 48, isAll: false, param: "48" });
    expect(parsePageSize("200", ADMIN_PAGE_SIZES, 25)).toMatchObject({ perPage: 200, isAll: false });
  });

  it("refuse une valeur non proposée plutôt que de la suivre", () => {
    // Sinon n'importe qui pourrait demander 100 000 produits en une requête.
    expect(parsePageSize("5000", SHOP_PAGE_SIZES, 12)).toMatchObject({ perPage: 12 });
    expect(parsePageSize("13", SHOP_PAGE_SIZES, 12)).toMatchObject({ perPage: 12 });
    expect(parsePageSize("-10", SHOP_PAGE_SIZES, 12)).toMatchObject({ perPage: 12 });
    expect(parsePageSize("abc", SHOP_PAGE_SIZES, 12)).toMatchObject({ perPage: 12 });
  });

  it("« tout » est accepté mais reste borné", () => {
    const r = parsePageSize(ALL_KEYWORD, SHOP_PAGE_SIZES, 12);
    expect(r.isAll).toBe(true);
    expect(r.perPage).toBe(MAX_PAGE_SIZE);
    expect(r.perPage).toBeLessThanOrEqual(1000);
  });

  it("accepte « TOUT » quelle que soit la casse", () => {
    expect(parsePageSize("Tout", SHOP_PAGE_SIZES, 12).isAll).toBe(true);
  });

  it("annonce l'effectif réel dans l'option « Tout »", () => {
    const choices = pageSizeChoices(SHOP_PAGE_SIZES, 800);
    expect(choices.at(-1)).toMatchObject({ param: ALL_KEYWORD, label: "Tout (800)" });
    expect(choices.map((c) => c.param)).toEqual(["12", "24", "48", "96", ALL_KEYWORD]);
  });

  it("n'annonce jamais plus que la borne", () => {
    expect(pageSizeChoices(ADMIN_PAGE_SIZES, 50_000).at(-1)?.label).toBe(`Tout (${MAX_PAGE_SIZE})`);
  });
});
