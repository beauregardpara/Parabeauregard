import { describe, expect, it } from "vitest";
import {
  checkoutSchema,
  couponSchema,
  loginSchema,
  adminLoginSchema,
} from "../src/lib/validation/schemas";

describe("checkoutSchema", () => {
  it("rejette un panier vide", () => {
    expect(checkoutSchema.safeParse({ fullName: "A", phone: "0600", email: "a@b.ma", street: "12 rue", city: "CAS", items: [] }).success).toBe(false);
  });
  it("rejette un email invalide", () => {
    expect(checkoutSchema.safeParse({ fullName: "A B", phone: "06000000", email: "pasunemail", street: "12 rue", city: "CAS", items: [{ productId: 1, qty: 1 }] }).success).toBe(false);
  });
  it("valide un cas valide", () => {
    expect(checkoutSchema.safeParse({
      fullName: "Salma Benali",
      phone: "0661234567",
      email: "salma@ex.ma",
      street: "12 rue des Orangers, Résidence X",
      city: "Casablanca",
      postalCode: "20000",
      paymentMethod: "COD",
      notes: "Livrer avant 18h",
      items: [{ productId: 42, qty: 3 }],
    }).success).toBe(true);
  });
  it("rejette l'absence de paymentMethod", () => {
    expect(checkoutSchema.safeParse({
      fullName: "A B", phone: "06000000", email: "a@b.ma",
      street: "12 rue des Orangers", city: "Casablanca",
      items: [{ productId: 1, qty: 1 }],
    }).success).toBe(false);
  });
  it("rejette une quantité négative", () => {
    expect(checkoutSchema.safeParse({ fullName: "A B", phone: "06000000", email: "a@b.ma", street: "12 rue", city: "CAS", items: [{ productId: 1, qty: -1 }] }).success).toBe(false);
  });
  it("limite à 50 articles max", () => {
    expect(checkoutSchema.safeParse({ fullName: "A B", phone: "06000000", email: "a@b.ma", street: "12 rue", city: "CAS", items: Array.from({ length: 51 }, (_, i) => ({ productId: i + 1, qty: 1 })) }).success).toBe(false);
  });
});

describe("couponSchema", () => {
  it("valide un bon code", () => {
    expect(couponSchema.safeParse({ code: "promo2026", type: "PERCENT", value: 15, minOrder: 0 }).success).toBe(true);
  });
  it("rejette une valeur négative", () => {
    expect(couponSchema.safeParse({ code: "bad", type: "PERCENT", value: -5, minOrder: 0 }).success).toBe(false);
  });
});

describe("loginSchema / adminLoginSchema", () => {
  it("login accepte n'importe quel password non vide", () => {
    expect(loginSchema.safeParse({ email: "a@b.ma", password: "x" }).success).toBe(true);
  });
  it("login rejette password vide", () => {
    expect(loginSchema.safeParse({ email: "a@b.ma", password: "" }).success).toBe(false);
  });
  it("adminLogin accepte un password de 128 caractères", () => {
    expect(adminLoginSchema.safeParse({ email: "a@b.ma", password: "a".repeat(128) }).success).toBe(true);
  });
  it("adminLogin rejette un password de 129 caractères", () => {
    expect(adminLoginSchema.safeParse({ email: "a@b.ma", password: "a".repeat(129) }).success).toBe(false);
  });
});