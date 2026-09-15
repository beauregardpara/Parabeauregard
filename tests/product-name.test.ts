import { describe, it, expect } from "vitest";
import { formatProductName, buildSearchText, foldForSearch } from "../src/lib/product-name";

describe("formatProductName", () => {
  it("remet en casse de titre les libellés tout en capitales", () => {
    expect(formatProductName("NUXE COFFRET GOLDEN SUMMER ROUTINE")).toBe(
      "Nuxe Coffret Golden Summer Routine"
    );
  });

  it("laisse intact un libellé déjà correctement composé", () => {
    const name = "Ducray Kelual DS Crème Apaisante 40ml";
    expect(formatProductName(name)).toBe(name);
    const name2 = "Vichy Capital Soleil UV-Age Daily SPF50+ 40ml";
    expect(formatProductName(name2)).toBe(name2);
  });

  it("préserve les sigles connus", () => {
    expect(formatProductName("SVR AMPOULE ANTI OX C 30 ML", "SVR")).toBe(
      "SVR Ampoule Anti OX C 30 ml"
    );
    expect(formatProductName("ISDIN FOTOPROTECTOR SPF 50 50 ML", "ISDIN")).toBe(
      "ISDIN Fotoprotector SPF 50 50 ml"
    );
  });

  it("met les unités en minuscules et les détache du nombre", () => {
    expect(formatProductName("CERAVE CREME 340G", "CeraVe")).toBe("CeraVe Creme 340 g");
    expect(formatProductName("BIODERMA HUILE DE DOUCHE 1 L", "Bioderma")).toBe(
      "Bioderma Huile de Douche 1 l"
    );
  });

  it("préserve les références alphanumériques", () => {
    expect(formatProductName("AVENE HYALURON ACTIV B3 CREME 40 ML", "Avène")).toBe(
      "Avène Hyaluron Activ B3 Creme 40 ml"
    );
    expect(formatProductName("ERAYBA COLORATION 5-36 CHATAIN CLAIR")).toBe(
      "Erayba Coloration 5-36 Chatain Clair"
    );
  });

  it("restitue l'écriture officielle de la marque en préfixe", () => {
    expect(formatProductName("LA ROCHE POSAY MELA B3 SERUM 30 ML", "La Roche-Posay")).toBe(
      "La Roche-Posay Mela B3 Serum 30 ml"
    );
    expect(formatProductName("L'OREAL PROFESSIONNEL METAL DETOX 250 ML", "L'Oréal")).toBe(
      "L'Oréal Professionnel Metal Detox 250 ml"
    );
  });

  it("gère la ponctuation interne des mots", () => {
    expect(formatProductName("URIAGE GYN-PHY TOILETTE INTIME 200 ML", "Uriage")).toBe(
      "Uriage Gyn-Phy Toilette Intime 200 ml"
    );
  });

  it("tolère les valeurs vides", () => {
    expect(formatProductName(null)).toBe("");
    expect(formatProductName("")).toBe("");
    expect(formatProductName("   ")).toBe("");
  });

  it("est idempotent", () => {
    const raw = "LA ROCHE POSAY EFFACLAR DUO+ GEL 40 ML";
    const once = formatProductName(raw, "La Roche-Posay");
    expect(formatProductName(once, "La Roche-Posay")).toBe(once);
  });
});

describe("buildSearchText / foldForSearch", () => {
  it("replie les accents et la casse", () => {
    expect(buildSearchText(["Avène Hydrance", "Avène"])).toContain("avene hydrance avene");
    expect(foldForSearch("Kérastase")).toBe("kerastase");
    expect(foldForSearch("Stérimar")).toBe("sterimar");
  });

  it("ajoute une variante compacte pour les marques ponctuées", () => {
    const text = buildSearchText(["L'Oréal Professionnel Metal Detox", "L'Oréal"]);
    // Forme espacée (issue de l'apostrophe) ET forme compacte tapée par l'utilisateur.
    expect(text).toContain("l oreal");
    expect(text).toContain("lorealprofessionnelmetaldetoxloreal");
  });

  it("tolère les valeurs vides", () => {
    expect(buildSearchText([null, undefined, ""])).toBe("");
  });
});
