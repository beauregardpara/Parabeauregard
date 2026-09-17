import { describe, expect, it } from "vitest";
import { SEED_ACCOUNTS, assertSeedTargetIsSafe, seedPassword } from "../prisma/seed-credentials";
import { canCancelAsDemo, isDemoEmail } from "../src/lib/demo-data";
import { LEGAL_FIELDS, getBusinessPolicies, getLegalEntries } from "../src/config/legal";

describe("seed — aucun identifiant réutilisable", () => {
  it("utilise uniquement le domaine réservé .invalid", () => {
    for (const account of Object.values(SEED_ACCOUNTS)) {
      expect(account.email.endsWith("@demo.invalid")).toBe(true);
    }
  });

  it("lit le mot de passe dans l'environnement", () => {
    expect(seedPassword("SEED_X", { SEED_X: "  ci-only-123456  " })).toEqual({ password: "ci-only-123456", generated: false });
  });

  it("refuse un mot de passe trop court", () => {
    expect(() => seedPassword("SEED_X", { SEED_X: "admin123" })).toThrow(/12 caractères/);
  });

  it("génère sinon un mot de passe aléatoire et différent à chaque fois", () => {
    const a = seedPassword("SEED_X", {});
    const b = seedPassword("SEED_X", {});
    expect(a.generated).toBe(true);
    expect(a.password.length).toBeGreaterThanOrEqual(24);
    expect(a.password).not.toBe(b.password);
  });

  it("refuse de viser une base hébergée ou la production", () => {
    expect(() => assertSeedTargetIsSafe({ DATABASE_URL: "postgresql://u@db.abcd.supabase.co:5432/postgres" })).toThrow();
    expect(() => assertSeedTargetIsSafe({ DATABASE_URL: "postgresql://u@aws-0-eu.pooler.supabase.com:6543/postgres" })).toThrow();
    expect(() => assertSeedTargetIsSafe({ NODE_ENV: "production", DATABASE_URL: "file:./dev.db" })).toThrow();
    expect(() => assertSeedTargetIsSafe({ DATABASE_URL: "postgresql://para@localhost:5432/para" })).not.toThrow();
    expect(() => assertSeedTargetIsSafe({ DATABASE_URL: "file:./ci.db" })).not.toThrow();
  });
});

describe("données de démonstration", () => {
  it.each(["client@demo.ma", "salma.test@example.ma", "cod-migration-test@example.invalid", "qa@shop.test", "x@example.com"])(
    "%s est une adresse de test",
    (email) => expect(isDemoEmail(email)).toBe(true)
  );

  it.each(["tahaait015@gmail.com", "parabeauregard@gmail.com", "client@exemple.ma", "", null])(
    "%s n'est pas une adresse de test",
    (email) => expect(isDemoEmail(email)).toBe(false)
  );

  it("n'annule jamais une vraie commande ni une commande livrée", () => {
    expect(canCancelAsDemo({ email: "client@demo.ma", status: "SHIPPED" })).toBe(true);
    expect(canCancelAsDemo({ email: "client@demo.ma", status: "DELIVERED" })).toBe(false);
    expect(canCancelAsDemo({ email: "client@demo.ma", status: "CANCELLED" })).toBe(false);
    expect(canCancelAsDemo({ email: "vrai.client@gmail.com", status: "NEW" })).toBe(false);
  });
});

describe("mentions légales et politiques", () => {
  it("affiche chaque champ en attente tant qu'il n'est pas fourni", () => {
    const entries = getLegalEntries({});
    expect(entries.map((e) => e.key)).toEqual(LEGAL_FIELDS.map((f) => f.key));
    expect(entries.every((e) => e.value === null)).toBe(true);
  });

  it("reprend telles quelles les valeurs fournies par l'exploitant", () => {
    const entries = getLegalEntries({ LEGAL_RC: " 123456 ", LEGAL_ICE: "" });
    expect(entries.find((e) => e.key === "rc")?.value).toBe("123456");
    expect(entries.find((e) => e.key === "ice")?.value).toBeNull();
  });

  it("n'annonce ni horaires ni délai de remboursement sans validation", () => {
    expect(getBusinessPolicies({})).toEqual({ openingHours: null, refundDelay: null });
    expect(getBusinessPolicies({ BUSINESS_OPENING_HOURS: "du lundi au samedi, de 9h à 19h" }).openingHours).toBe(
      "du lundi au samedi, de 9h à 19h"
    );
  });
});
