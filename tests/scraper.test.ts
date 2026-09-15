import { describe, expect, it } from "vitest";
import { parseMoroccanPrice, detectAvailability } from "../src/lib/scraper/types";

describe("parseMoroccanPrice", () => {
  it("gère les espaces de milliers", () => {
    expect(parseMoroccanPrice("1 299,00 DH")).toBe(1299);
  });
  it("gère la virgule décimale et le suffixe MAD", () => {
    expect(parseMoroccanPrice("149.90 MAD")).toBe(149.9);
  });
  it("gère 129,90", () => {
    expect(parseMoroccanPrice("129,90")).toBe(129.9);
  });
  it("gère le format 1.299,00 (point milliers + virgule décimale)", () => {
    expect(parseMoroccanPrice("1.299,00")).toBe(1299);
  });
  it("gère 129.90 (point décimal, pas de virgule)", () => {
    expect(parseMoroccanPrice("129.90")).toBe(129.9);
  });
  it("gère 99 dh", () => {
    expect(parseMoroccanPrice("99 dh")).toBe(99);
  });
  it("ne retourne rien sur du vide / nul / invalide", () => {
    expect(parseMoroccanPrice("")).toBeNull();
    expect(parseMoroccanPrice(null)).toBeNull();
    expect(parseMoroccanPrice(undefined)).toBeNull();
    expect(parseMoroccanPrice("gratuit")).toBeNull();
  });
  it("arrondit à 2 décimales", () => {
    expect(parseMoroccanPrice("10,555")).toBe(10.56);
  });
});

describe("detectAvailability", () => {
  it("détecte la rupture", () => {
    expect(detectAvailability("En rupture de stock")).toBe("OUT_OF_STOCK");
    expect(detectAvailability("Produit indisponible")).toBe("OUT_OF_STOCK");
  });
  it("détecte disponible", () => {
    expect(detectAvailability("En stock")).toBe("IN_STOCK");
    expect(detectAvailability("Disponible")).toBe("IN_STOCK");
    expect(detectAvailability("Ajouter au panier")).toBe("IN_STOCK");
  });
  it("retourne UNKNOWN sinon", () => {
    expect(detectAvailability("")).toBe("UNKNOWN");
    expect(detectAvailability(null)).toBe("UNKNOWN");
    expect(detectAvailability("Aucune information")).toBe("UNKNOWN");
  });
});