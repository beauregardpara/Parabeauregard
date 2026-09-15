import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { statusLabel, ORDER_STATUS_LABELS, VALID_ORDER_STATES } from "../src/lib/order-status";
import { cityShippingFee } from "../src/lib/settings";
import { computeProductQuality } from "../src/lib/scraper/quality";
import { normalize, expandKeywords, searchTermsForQuery } from "../src/lib/search/synonyms";
import { returnSchema, productAlertSchema } from "../src/lib/validation/schemas";
import { buildComparisonData, buildLocalComparison, type ComparableProduct } from "../src/lib/compare";
import { applyContextToMessage } from "../src/lib/chat/context";

describe("statusLabel / statuts commande", () => {
  it("renvoie un libellé pour chaque statut valide", () => {
    expect(VALID_ORDER_STATES.every((s) => typeof statusLabel(s) === "string" && statusLabel(s).length > 0)).toBe(true);
    expect(statusLabel("DELIVERED")).toBe("Livrée");
    expect(statusLabel("UNKNOWN_STATE")).toBe("UNKNOWN_STATE");
  });
  it("couvre l'ensemble des clés du premier ordre", () => {
    expect(Object.keys(ORDER_STATUS_LABELS).sort()).toEqual([...VALID_ORDER_STATES].sort());
  });
});

describe("cityShippingFee", () => {
  const cities = [
    { city: "Casablanca", fee: 25 },
    { city: "Settat", fee: 35 },
    { city: "Ouezzane", fee: 30 },
  ];

  it("trouve une ville insensible à la casse et aux accents", () => {
    expect(cityShippingFee(cities, "ouezzane")).toBe(30);
    expect(cityShippingFee(cities, "Casablanca")).toBe(25);
  });
  it("retourne null pour une ville inconnue ou vide", () => {
    expect(cityShippingFee(cities, "Rabat")).toBeNull();
    expect(cityShippingFee(cities, "  ")).toBeNull();
    expect(cityShippingFee(cities, null)).toBeNull();
    expect(cityShippingFee(cities, undefined)).toBeNull();
  });
  it("retourne null pour une liste vide", () => {
    expect(cityShippingFee([], "Casablanca")).toBeNull();
  });
});

describe("computeProductQuality", () => {
  const base = {
    name: "Crème Hydratante Visage 50 ml",
    price: 199,
    imageCount: 3,
    description: "Crème nourrissante pour peau sèche.",
    shortDescription: null as string | null,
    promoPrice: null as number | null,
  };

  it("attribue 100 à un produit complet", () => {
    const { score, issues } = computeProductQuality(base);
    expect(score).toBe(100);
    expect(issues).toHaveLength(0);
  });

  it("pénalise le nom court et l'absence de description", () => {
    const { score, issues } = computeProductQuality({ ...base, name: "Crème", shortDescription: null, description: null });
    expect(score).toBe(90);
    expect(issues.map((i) => i.type)).toContain("SHORT_NAME");
    expect(issues.map((i) => i.type)).toContain("NO_DESCRIPTION");
  });

  it("bloque sur prix nul ou manquant", () => {
    const { score } = computeProductQuality({ ...base, price: 0 });
    expect(score).toBeLessThanOrEqual(75);
  });

  it("pénalise l'absence d'image et le doublon de nom", () => {
    const { score, issues } = computeProductQuality({ ...base, imageCount: 0 }, { duplicateCount: 2 });
    expect(issues.map((i) => i.type)).toEqual(expect.arrayContaining(["NO_IMAGE", "DUPLICATE_NAME"]));
    expect(score).toBe(70);
  });

  it("signale une promotion incohérente (>= prix de base)", () => {
    const { score, issues } = computeProductQuality({ ...base, promoPrice: 200 });
    expect(issues.map((i) => i.type)).toContain("INCOHERENT_PROMO");
    expect(score).toBe(95);
  });

  it("accumule les pénalités (score minimal garanti à 0)", () => {
    const { score, issues } = computeProductQuality({
      ...base,
      name: "B",
      price: -5,
      imageCount: 0,
      description: null,
      promoPrice: 100,
    }, { duplicateCount: 3 });
    expect(issues).toHaveLength(6);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(100);
  });
});

describe("synonymes / recherche", () => {
  it("normalise minuscules et accents", () => {
    expect(normalize("  Peau  Sèche  ")).toBe("peau seche");
  });

  it("étend un mot-clé avec ses synonymes, sans doublons", () => {
    const terms = expandKeywords("acne");
    expect(terms[0]).toBe("acne");
    expect(terms).toContain("purifiant");
    expect(new Set(terms).size).toBe(terms.length);
    expect(expandKeywords("inconnuex")).toEqual(["inconnuex"]);
    expect(expandKeywords("")).toEqual([]);
  });

  it("ignore les mots vides et les nombres", () => {
    const terms = searchTermsForQuery("je cherche une crème pour 200 dh");
    expect(terms).toContain("creme");
    expect(terms).not.toContain("je");
    expect(terms).not.toContain("200");
    expect(terms).not.toContain("dh");
  });

  it("borne le nombre de termes", () => {
    const terms = searchTermsForQuery("je cherche un gel nettoyant pour peau grasse", 3);
    expect(terms.length).toBeLessThanOrEqual(3);
  });
});

describe("validations retours / alertes", () => {
  it("accepte une demande de retour valide", () => {
    const r = returnSchema.safeParse({
      reference: "PB-2026-ABCDEF",
      email: "client@exemple.com",
      reason: "Article différent de la description.",
    });
    expect(r.success).toBe(true);
  });

  it("rejette une référence au mauvais format", () => {
    expect(returnSchema.safeParse({ reference: "2026-123", email: "a@b.co", reason: "Raison valide" }).success).toBe(false);
  });

  it("rejette un email invalide et une raison trop courte", () => {
    expect(returnSchema.safeParse({ reference: "PB-2026-ABCDEF", email: "n-email", reason: "R" }).success).toBe(false);
  });

  it("normalise l'email des alertes stock", () => {
    const r = productAlertSchema.safeParse({ email: "  USER@Example.COM ", productId: 12 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("user@example.com");
  });
});

function product(overrides: Partial<ComparableProduct>): ComparableProduct {
  return {
    slug: "x",
    name: "Produit",
    brand: "Marque",
    price: 100,
    promoPrice: null,
    category: "Soin",
    description: null,
    imageUrl: null,
    rating: null,
    reviewsCount: 0,
    ...overrides,
    effectivePrice: overrides.effectivePrice ?? overrides.price ?? 100,
  };
}

describe("comparateur", () => {
  const p1 = product({
    slug: "creme-seche",
    name: "Crème Hydratante Peau Sèche",
    price: 200,
    promoPrice: 150,
    effectivePrice: 150,
    rating: 4.5,
    reviewsCount: 3,
    description: "Hydratation intense pour peau sèche, SPF 30.",
  });
  const p2 = product({
    slug: "serum-antiage",
    name: "Sérum Anti-Âge Rides",
    price: 180,
    effectivePrice: 180,
    rating: 3,
    reviewsCount: 1,
    description: "Actifs régénérants pour rides et fermeté.",
  });

  it("dérive les atouts uniquement du texte réel des produits", () => {
    const rows = buildComparisonData([p1, p2]);
    const c1 = rows.find((r) => r.slug === "creme-seche");
    const c2 = rows.find((r) => r.slug === "serum-antiage");
    expect(c1?.chips).toContain("Hydratant");
    expect(c1?.chips).toContain("Peau sèche");
    expect(c1?.chips).toContain("Protection solaire");
    expect(c2?.chips).toContain("Anti-âge");
    expect(c2?.chips).not.toContain("Hydratant");
  });

  it("produit un verdict uniquement factuel (prix, promo, note)", () => {
    const res = buildLocalComparison([p2, p1]);
    expect(res.ai).toBe(false);
    expect(res.verdict).toContain("Le meilleur prix est");
    expect(res.summaries).toHaveLength(2);
    const s1 = res.summaries.find((s) => s.slug === "creme-seche");
    expect(s1?.summary).toContain("150.00 DH");
    expect(s1?.summary).toContain("promotion");
    expect(s1?.summary).toContain("4.5/5");
  });

  it("reste factuel sans données de notation", () => {
    const res = buildLocalComparison([product({ slug: "a", price: 50, effectivePrice: 50 }), product({ slug: "b", price: 40, effectivePrice: 40 })]);
    expect(res.verdict).toContain("40.00 DH");
    expect(res.verdict).not.toContain("meilleure note");
  });
});

describe("contexte chat", () => {
  const need = { keywords: ["creme", "hydratant"], maxPrice: 150, minPrice: 50 };

  it("ajoute le contexte aux messages courts", () => {
    const out = applyContextToMessage("oui", need, true);
    expect(out).toContain("creme");
    expect(out).toContain("budget max 150 DH");
  });

  it("laisse intacts les messages de 3 mots ou plus", () => {
    expect(applyContextToMessage("Avez-vous des gels moussants ?", need, true)).toBe("Avez-vous des gels moussants ?");
  });

  it("ne modifie rien sans besoin ou si désactivé", () => {
    expect(applyContextToMessage("oui", need, false)).toBe("oui");
    expect(applyContextToMessage("oui", null, true)).toBe("oui");
  });
});