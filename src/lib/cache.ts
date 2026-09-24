import { unstable_cache } from "next/cache";

/**
 * Cache serveur des lectures catalogue.
 *
 * Le layout racine lit les en-têtes de la requête, ce qui rend toutes les pages
 * dynamiques : sans ce cache, chaque visite rejoue toutes les requêtes vers
 * Supabase, dont la latence mesurée est de 760 à 900 ms. Les pages catégorie
 * mettaient ainsi 4 secondes à s'afficher.
 *
 * Toute écriture sur un produit invalide le marqueur (voir `revalidateCatalogue`),
 * donc l'administration reste immédiate malgré la durée de vie.
 */
export const CATALOGUE_TAG = "catalogue";

/** Durée de vie par défaut : assez courte pour rester juste, assez longue pour servir. */
export const CATALOGUE_TTL = 300;

export function cachedCatalogue<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  keyParts: string[],
  revalidate: number = CATALOGUE_TTL
) {
  return unstable_cache(fn, keyParts, { revalidate, tags: [CATALOGUE_TAG] });
}
