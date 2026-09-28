import type { Prisma } from "@prisma/client";
import { foldForSearch } from "@/lib/product-name";
import { searchWordGroupsForQuery } from "@/lib/search/synonyms";

/** Champs interrogés pour un terme donné. */
function fieldMatches(term: string): Prisma.ProductWhereInput[] {
  // `searchText` est replié (minuscules, sans accents) : indispensable car
  // SQLite compare les LIKE octet à octet — « avene » doit trouver « Avène ».
  const folded = foldForSearch(term);
  return [
    ...(folded ? [{ searchText: { contains: folded } }] : []),
    { name: { contains: term } },
    { brand: { contains: term } },
    { shortDescription: { contains: term } },
    { description: { contains: term } },
  ];
}

/**
 * Filtre texte d'une requête produit.
 *
 * `strict` (défaut) : chaque mot de la requête doit apparaître quelque part
 * dans la fiche, dans n'importe quel ordre — ou la requête entière telle
 * quelle. `loose` : au moins un mot suffit, pour un repli quand `strict` ne
 * renvoie rien.
 *
 * Renvoie `null` si la requête ne contient rien d'interrogeable.
 */
export function productTextWhere(
  q: string,
  mode: "strict" | "loose" = "strict"
): Prisma.ProductWhereInput | null {
  const query = q.trim();
  if (!query) return null;

  const groups = searchWordGroupsForQuery(query);
  const phrase = fieldMatches(query);

  // Aucun mot interrogeable (requête faite de ponctuation ou de mots-vides) :
  // on ne garde la requête entière que si elle contient au moins une lettre.
  if (groups.length === 0) {
    return foldForSearch(query) ? { OR: phrase } : null;
  }

  if (mode === "loose") {
    return { OR: [...groups.flat().flatMap(fieldMatches), ...phrase] };
  }

  const perWord = groups.map((group) => ({ OR: group.flatMap(fieldMatches) }));
  // La requête entière reste une alternative : elle rattrape les mots-vides
  // (« eau de rose ») que le découpage écarte.
  return { OR: [{ AND: perWord }, ...phrase] };
}
