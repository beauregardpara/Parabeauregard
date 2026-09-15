import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { checkoutSchema } from "../src/lib/validation/schemas";

/**
 * Régression : la page /commander construisait sa charge utile sans
 * `paymentMethod`, que `checkoutSchema` exige — aucune commande ne pouvait
 * aboutir (« Invalid literal value, expected "COD" » affiché au client).
 */
describe("contrat de commande client ↔ serveur", () => {
  it("accepte exactement la charge utile envoyée par la page /commander", () => {
    const payload = {
      fullName: "Salma Benali",
      phone: "0612345678",
      email: "salma@example.ma",
      street: "12 rue des Orangers, Apt 3",
      city: "Casablanca",
      postalCode: "",
      paymentMethod: "COD",
      notes: "",
      couponCode: undefined,
      items: [{ productId: 1, qty: 1 }],
    };
    const parsed = checkoutSchema.safeParse(payload);
    expect(parsed.success, parsed.success ? "" : parsed.error.issues[0]?.message).toBe(true);
  });

  it("la page /commander transmet bien un mode de paiement", () => {
    const page = readFileSync("src/app/commander/page.tsx", "utf8");
    expect(page).toMatch(/paymentMethod:\s*"COD"/);
  });

  it("refuse un mode de paiement inconnu avec un message en français", () => {
    const parsed = checkoutSchema.safeParse({
      fullName: "Salma Benali",
      phone: "0612345678",
      email: "salma@example.ma",
      street: "12 rue des Orangers",
      city: "Casablanca",
      paymentMethod: "CARD",
      items: [{ productId: 1, qty: 1 }],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe("Mode de paiement non supporté.");
    }
  });
});
