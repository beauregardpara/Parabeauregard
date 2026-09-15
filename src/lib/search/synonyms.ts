/**
 * Expansion de synonymes pour la recherche produit et l'autocomplétion.
 * Toutes les clés et valeurs sont écrites normalisées (minuscules, sans accents)
 * pour rester déterministes et comparables avec le texte des produits.
 */

/** Normalise un texte : minuscules, sans accents, espaces redondants supprimés. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Carte FR→normalisé : un mot-clé métier (ex. « sèche ») pointe vers les
 * termes réellement présents dans le corpus produits.
 */
export const SYNONYM_MAP: Readonly<Record<string, readonly string[]>> = {
  seche: ["hydratant", "hydratante", "hydratation", "nourrissant", "nutrition"],
  seches: ["hydratant", "hydratante", "hydratation", "nourrissant", "nutrition"],
  secheresse: ["hydratant", "hydratante", "hydratation", "nourrissant", "nutrition"],
  rides: ["fermete", "antiage", "lifting", "regenerant"],
  ride: ["fermete", "antiage", "lifting"],
  antiage: ["fermete", "rides", "lifting"],
  "anti-age": ["fermete", "rides", "lifting"],
  acne: ["purifiant", "purifiante", "purification", "imperfections", "boutons"],
  imperfection: ["purifiant", "purifiante", "acne", "boutons"],
  imperfections: ["purifiant", "purifiante", "acne", "boutons"],
  chute: ["fortifiant", "fortifiante", "anticheute", "densite"],
  vitamine: ["immunite", "tonus", "energie", "vitamines"],
  vitamins: ["immunite", "tonus", "energie"],
  fatigue: ["immunite", "tonus", "energie", "vitamines"],
  pellicules: ["antipelliculaire", "anti-pelliculaire", "shampooing"],
  "anti-pelliculaire": ["antipelliculaire"],
  antipelliculaire: ["anti-pelliculaire"],
  solaire: ["protection", "spf", "soleil", "uv"],
  soleil: ["protection", "solaire", "spf"],
  spf: ["protection", "solaire", "uv"],
  cheveux: ["capillaire", "cheveu"],
  cheveu: ["capillaire", "cheveux"],
  cuir: ["capillaire"],
  cuirs: ["capillaire"],
  bebe: ["nourrisson", "nourrissons", "layette"],
  nourrisson: ["layette", "bebe"],
};

/**
 * Renvoie [terme normalisé lui-même, ...synonymes] pour un mot-clé donné.
 * Ordre déterministe, sans doublons.
 */
export function expandKeywords(term: string): string[] {
  const normalized = normalize(term);
  if (!normalized) return [];
  const out = [normalized];
  const synonyms = SYNONYM_MAP[normalized] ?? [];
  for (const synonym of synonyms) {
    if (!out.includes(synonym)) out.push(synonym);
  }
  return out;
}

/** Mots courants à ignorer lors de l'extraction de termes de recherche. */
const STOPWORDS = new Set([
  "je", "cherche", "cherches", "veux", "voudrais", "aimerais", "besoin", "pour", "avec", "sans",
  "une", "un", "des", "du", "de", "la", "le", "les", "mon", "ma", "mes", "son", "sa", "ses",
  "produit", "produits", "article", "articles", "budget", "prix", "moins", "que", "qui",
  "est", "suis", "avoir", "femme", "homme", "enfant",
  "dh", "dhs", "mad", "euros", "merci", "svp", "bonjour", "salut", "hello",
  "en", "au", "aux", "ai", "et", "ou", "sur", "dans", "pas", "plus", "tres", "mais", "merci",
]);

/**
 * Renvoie les mots-clés normalisés d'une requête (mots-vides retirés),
 * chaque mot étant étendu avec ses synonymes. Résultat dédupliqué et borné.
 */
export function searchTermsForQuery(q: string, maxTerms = 20): string[] {
  const cleaned = normalize(q).replace(/[^\p{L}\p{N}\s-]/gu, " ");
  const words = cleaned
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));

  const seen = new Set<string>();
  const terms: string[] = [];
  for (const word of words) {
    for (const term of expandKeywords(word)) {
      if (!seen.has(term)) {
        seen.add(term);
        terms.push(term);
      }
      if (terms.length >= maxTerms) return terms;
    }
  }
  return terms;
}