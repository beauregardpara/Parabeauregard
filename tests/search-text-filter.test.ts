import { describe, expect, it } from "vitest";
import { productTextWhere } from "@/lib/search/text-filter";
import { buildSearchText } from "@/lib/product-name";
import { searchWordGroupsForQuery } from "@/lib/search/synonyms";

type Fiche = {
  name: string;
  brand?: string | null;
  shortDescription?: string | null;
  description?: string | null;
};

/**
 * Évalue un `where` Prisma comme le ferait SQLite sur une fiche produit :
 * `contains` insensible à la casse, `AND`/`OR` imbriqués. Indispensable ici :
 * le défaut corrigé venait de la *structure* du where, pas des champs.
 */
function correspond(fiche: Fiche, where: unknown): boolean {
  const champs: Record<string, string> = {
    name: fiche.name,
    brand: fiche.brand ?? "",
    shortDescription: fiche.shortDescription ?? "",
    description: fiche.description ?? "",
    searchText: buildSearchText([
      fiche.name,
      fiche.brand,
      fiche.shortDescription,
      fiche.description,
    ]),
  };

  if (!where || typeof where !== "object") return false;
  const noeud = where as Record<string, unknown>;

  if (Array.isArray(noeud.AND)) return noeud.AND.every((n) => correspond(fiche, n));
  if (Array.isArray(noeud.OR)) return noeud.OR.some((n) => correspond(fiche, n));

  return Object.entries(noeud).every(([champ, cond]) => {
    const attendu = (cond as { contains?: string }).contains ?? "";
    return champs[champ]?.toLowerCase().includes(attendu.toLowerCase()) ?? false;
  });
}

function trouve(fiches: Fiche[], q: string, mode: "strict" | "loose" = "strict"): string[] {
  const where = productTextWhere(q, mode);
  if (!where) return [];
  return fiches.filter((f) => correspond(f, where)).map((f) => f.name);
}

const CATALOGUE: Fiche[] = [
  {
    name: "Gel Moussant Purifiant Effaclar",
    brand: "La Roche-Posay",
    shortDescription: "Nettoyant moussant pour peaux grasses",
  },
  {
    name: "Minéral 89 Sérum Fortifiant",
    brand: "Vichy",
    shortDescription: "Sérum à l'acide hyaluronique",
  },
  {
    name: "Hydrance Légère Crème Hydratante",
    brand: "Avène",
    shortDescription: "Crème hydratante pour peaux sensibles",
  },
  { name: "Shampooing Antipelliculaire", brand: "Ducray" },
];

describe("filtre texte de la recherche produit", () => {
  it("trouve un produit quand les mots sont dans l'ordre", () => {
    expect(trouve(CATALOGUE, "Gel Moussant")).toEqual(["Gel Moussant Purifiant Effaclar"]);
  });

  it("trouve le même produit quand les mots sont inversés", () => {
    // Le défaut signalé : « Moussant Gel » ne renvoyait rien parce que la
    // requête entière devait apparaître telle quelle.
    expect(trouve(CATALOGUE, "Moussant Gel")).toEqual(["Gel Moussant Purifiant Effaclar"]);
  });

  it("trouve un produit avec des mots non adjacents", () => {
    expect(trouve(CATALOGUE, "Vichy sérum 89")).toEqual(["Minéral 89 Sérum Fortifiant"]);
    expect(trouve(CATALOGUE, "crème Avène hydratante")).toEqual([
      "Hydrance Légère Crème Hydratante",
    ]);
  });

  it("ignore les accents et la casse", () => {
    expect(trouve(CATALOGUE, "AVENE creme")).toEqual(["Hydrance Légère Crème Hydratante"]);
  });

  it("exige tous les mots en mode strict", () => {
    expect(trouve(CATALOGUE, "gel moussant vichy")).toEqual([]);
  });

  it("accepte une partie des mots en mode de repli", () => {
    expect(trouve(CATALOGUE, "gel moussant vichy", "loose")).toEqual([
      "Gel Moussant Purifiant Effaclar",
      "Minéral 89 Sérum Fortifiant",
    ]);
  });

  it("étend les synonymes métier", () => {
    expect(trouve(CATALOGUE, "pellicules")).toEqual(["Shampooing Antipelliculaire"]);
  });

  it("ne renvoie aucun filtre pour une requête vide", () => {
    expect(productTextWhere("   ")).toBeNull();
    expect(productTextWhere("!!")).toBeNull();
  });

  it("garde les mots-vides pour une requête qui n'en contient que", () => {
    expect(searchWordGroupsForQuery("de la")).toEqual([]);
  });
});
