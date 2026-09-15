import { describe, it, expect } from "vitest";
import { cleanDescription } from "../src/lib/product-description";

describe("cleanDescription", () => {
  it("retire les libellés d'interface des sites sources", () => {
    expect(cleanDescription("Soin hydratant. Lire la suiteShow less")).toBe("Soin hydratant.");
    expect(cleanDescription("Crème apaisante Ajouter au panier")).toBe("Crème apaisante");
  });

  it("normalise les espaces et les lignes vides", () => {
    expect(cleanDescription("Ligne A\n\n\n\n   Ligne B   ")).toBe("Ligne A\n\nLigne B");
    expect(cleanDescription("Texte      espacé")).toBe("Texte espacé");
  });

  it("répare les ponctuations collées issues du scraping", () => {
    expect(cleanDescription("régénérer votre peau.Le soin Longue Vie")).toBe("régénérer votre peau. Le soin Longue Vie");
    expect(cleanDescription("3 actions, il :Dynamise et stimule")).toBe("3 actions : il dynamise et stimule");
  });

  it("préserve le contenu informatif", () => {
    const t = "Crème hydratante 40 ml, à appliquer matin et soir.";
    expect(cleanDescription(t)).toBe(t);
  });

  it("renvoie null quand il ne reste rien", () => {
    expect(cleanDescription(null)).toBeNull();
    expect(cleanDescription("   ")).toBeNull();
    expect(cleanDescription("Lire la suite")).toBeNull();
  });

  it("est idempotent", () => {
    const raw = "Soin.   Lire la suiteShow less\n\n\n\n  Fin  ";
    const once = cleanDescription(raw)!;
    expect(cleanDescription(once)).toBe(once);
  });
});
