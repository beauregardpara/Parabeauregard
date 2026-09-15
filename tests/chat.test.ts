import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { parseNeed } from "../src/lib/chat";

describe("parseNeed", () => {
  it("extrait le budget « budget 150 dh »", () => {
    expect(parseNeed("Je cherche une crème, budget 150 dh")).toMatchObject({
      keywords: expect.arrayContaining(["creme"]),
      maxPrice: 150,
    });
  });

  it("extrait « moins de 200 »", () => {
    const r = parseNeed("un sérum moins de 200");
    expect(r.maxPrice).toBe(200);
  });

  it("extrait la fourchette « entre 100 et 250 dhs »", () => {
    const r = parseNeed("un lait hydratant entre 100 et 250 dhs");
    expect(r.minPrice).toBe(100);
    expect(r.maxPrice).toBe(250);
  });

  it("extrait la fourchette « de 80 à 120 dh »", () => {
    const r = parseNeed("shampooing de 80 à 120 dh");
    expect(r.minPrice).toBe(80);
    expect(r.maxPrice).toBe(120);
  });

  it("ne déduit pas un prix sans contexte", () => {
    const r = parseNeed("crème 150");
    expect(r.maxPrice).toBeUndefined();
    expect(r.minPrice).toBeUndefined();
  });

  it("nettoie la ponctuation, ignore les mots vides et les nombres-prix", () => {
    const r = parseNeed("Bonjour, je voudrais un gel nettoyant pour peau grasse.");
    expect(r.keywords).toContain("gel");
    expect(r.keywords).toContain("nettoyant");
    expect(r.keywords).toContain("grasse");
    expect(r.keywords).not.toContain("bonjour");
    expect(r.keywords).not.toContain("je");
    expect(r.keywords).not.toContain("pour");
  });

  it("n'inclut pas le montant du budget dans les mots-clés", () => {
    const r = parseNeed("un sérum hydratant pour 200 dh");
    expect(r.keywords).toContain("serum");
    expect(r.keywords).not.toContain("200");
  });

  it("retourne une liste vide sans mots-clés pertinents", () => {
    expect(parseNeed("bonjour merci").keywords).toEqual([]);
  });
});