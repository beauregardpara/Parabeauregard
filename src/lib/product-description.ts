/**
 * Nettoyage des descriptions produits issues du scraping.
 *
 * Les fiches sources embarquent des fragments d'interface (« Lire la suite »,
 * « Show less », « Ajouter au panier ») et de longues séquences d'espaces
 * héritées de leur mise en page HTML. On les retire pour obtenir un texte
 * lisible, sans jamais altérer le contenu informatif.
 */

/** Fragments d'interface des sites sources, retirés du texte. */
const UI_ARTIFACTS = [
  "Lire la suite",
  "Show less",
  "Show more",
  "Read more",
  "Voir plus",
  "Voir moins",
  "En savoir plus",
  "Ajouter au panier",
  "Ajouter au devis",
  "Rupture de stock",
];

/**
 * Nettoie une description brute.
 * @returns le texte nettoyé, ou `null` s'il ne reste rien d'exploitable.
 */
export function cleanDescription(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let text = raw.replace(/\r\n?/g, "\n");

  // Retrait des libellés d'interface, y compris collés au texte voisin.
  for (const artifact of UI_ARTIFACTS) {
    text = text.split(artifact).join(" ");
  }

  text = text
    // Espaces insécables et caractères invisibles.
    .replace(/[ ​﻿]/g, " ")
    // Espaces multiples au sein d'une ligne.
    .replace(/[ \t]{2,}/g, " ")
    // Espaces en début/fin de ligne.
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    // Au plus une ligne vide entre deux paragraphes.
    .replace(/\n{3,}/g, "\n\n")
    // Répare les séparateurs typographiques collés par certains scrapers.
    .replace(/([.!?])(?=[A-ZÀ-ÖØ-Þ])/g, "$1 ")
    // Certains scrapers déplacent le deux-points après « il » et collent
    // une majuscule au verbe : « actions, il :Dynamise ».
    .replace(/,\s+il\s*:\s*Dynamise/gi, " : il dynamise")
    .replace(/\s*:\s*/g, " : ")
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/ {2,}/g, " ")
    .trim();

  return text.length > 0 ? text : null;
}
