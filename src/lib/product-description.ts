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

/** Classes et bibliothèques CSS parfois récupérées par les scrapers au lieu
 * du texte visible (Elementor/WordPress et widgets associés). */
const TECHNICAL_TOKENS = /(?:elementor|e-con|e-flex|e-child|wp-block|woocommerce|swiper|slick|fa-)[a-z0-9_.-]*/gi;

function decodeBasicEntities(text: string): string {
  const named: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&lt;": "<",
    "&gt;": ">",
  };
  return text
    .replace(/&(?:nbsp|amp|quot|apos|lt|gt);|&#39;/gi, (entity) => named[entity.toLowerCase()] ?? entity)
    .replace(/&#(\d+);/g, (_, code: string) => {
      const value = Number(code);
      return Number.isSafeInteger(value) && value >= 0 && value <= 0x10ffff ? String.fromCodePoint(value) : " ";
    });
}

/**
 * Nettoie une description brute.
 * @returns le texte nettoyé, ou `null` s'il ne reste rien d'exploitable.
 */
export function cleanDescription(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let text = raw.replace(/\r\n?/g, "\n");

  // Du CSS brut peut précéder tout le contenu visible de la fiche source.
  // Ne supprimer ce préfixe que lorsqu'il commence bien par un sélecteur CSS.
  const cssStart = text.search(/\.elementor-\d+\b|@media\s*\(/i);
  if (cssStart >= 0) {
    const lastBrace = text.lastIndexOf("}");
    if (lastBrace >= cssStart) text = `${text.slice(0, cssStart)}\n\n${text.slice(lastBrace + 1)}`;
  }

  // Certains scrapers récupèrent le HTML ou les classes CSS au lieu du texte
  // visible. Les retirer avant la normalisation évite de publier du code
  // Elementor dans la fiche produit.
  text = text
    .replace(/<!--(?:.|\n|\r)*?-->/g, " ")
    .replace(/<(script|style|svg|noscript|template)\b[^>]*>(?:.|\n|\r)*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\b(?:class|style|data-[a-z0-9_-]+|aria-[a-z0-9_-]+)\s*=\s*["'][^"']*["']/gi, " ")
    .replace(TECHNICAL_TOKENS, " ");
  text = decodeBasicEntities(text);

  // Retrait des libellés d'interface, y compris collés au texte voisin.
  for (const artifact of UI_ARTIFACTS) {
    text = text.replace(new RegExp(artifact, "gi"), " ");
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
