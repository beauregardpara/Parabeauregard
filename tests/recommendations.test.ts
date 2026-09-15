import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

/**
 * Garde-fou : aucune requête de recommandation ne doit proposer un produit
 * non commandable (rupture de stock) — cf. cross-sell du panier.
 */
describe("recommandations : disponibilité", () => {
  const source = readFileSync("src/lib/recommendations.ts", "utf8");

  it("définit un filtre de disponibilité", () => {
    expect(source).toMatch(/const AVAILABLE\s*=/);
    expect(source).toContain("unlimitedStock: true");
    expect(source).toContain("stock: { gt: 0 }");
  });

  it("n'utilise plus le filtre statut seul dans les requêtes produits", () => {
    const rawStatusOnly = source.match(/where:\s*\{\s*status:\s*"PUBLISHED"\s*[,}]/g) ?? [];
    expect(rawStatusOnly).toHaveLength(0);
  });

  it("applique AVAILABLE à chaque findMany de produits", () => {
    const finds = source.match(/db\.product\.findMany\(\{[\s\S]*?\n  \}\)/g) ?? [];
    expect(finds.length).toBeGreaterThanOrEqual(4);
    for (const block of finds) expect(block).toContain("AVAILABLE");
  });
});
