import { db } from "@/lib/db";

/** Mots courants à ignorer lors de l'extraction de mots-clés. */
const STOPWORDS = new Set([
  "je", "cherche", "cherches", "veux", "voudrais", "aimerais", "besoin", "pour", "avec", "sans",
  "une", "un", "des", "du", "de", "la", "le", "les", "mon", "ma", "mes", "son", "sa", "ses",
  "produit", "produits", "article", "articles", "budget", "prix", "moins", "que", "qui",
  "est", "suis", "avoir", "femme", "homme", "enfant",
  "dh", "dhs", "mad", "euros", "merci", "svp", "bonjour", "salut", "hello",
  // Mots de question ou de liaison : ils ne décrivent jamais un produit.
  "quel", "quelle", "quels", "quelles", "quoi", "comment", "prendre", "faut", "faire", "dois", "doit",
  "peux", "peut", "pouvez", "utiliser", "meilleur", "meilleure", "conseil", "conseillez", "recommandez",
  "et", "ou", "au", "aux", "en", "sur", "dans", "par", "ce", "cette", "ces", "moi", "vous", "tu",
  // Mots ajoutés par applyContextToMessage : ils ne décrivent pas le besoin.
  "contexte", "recherche", "continue",
]);

/**
 * Groupes de synonymes : si le message contient l'un d'eux, les produits dont
 * le nom/description contient n'importe quel mot du groupe sont favorisés.
 * (tout en minuscules, sans accents)
 */
const SYNONYM_GROUPS: string[][] = [
  ["creme", "baume", "lait", "gel", "onguent"],
  ["seche", "seches", "hydrate", "hydratant", "hydratante", "hydratation", "nourrissant", "nutrition"],
  ["sensible", "sensibles", "reactive", "reactives", "apaisant", "apaisante", "tolerance"],
  ["grasse", "grasses", "acne", "imperfection", "imperfections", "bouton", "boutons", "purifiant"],
  ["antiage", "age", "ride", "rides", "fermete", "lifting"],
  ["tache", "taches", "pigmentation", "eclat"],
  ["solaire", "soleil", "spf", "uv", "bronzage"],
  ["chute", "anticheute", "densite", "fortifiant", "fortifiante", "stimulant"],
  ["pellicule", "pellicules", "demangeaison", "squame"],
  ["bebe", "nourrisson", "nourrissons", "layette"],
  ["minceur", "draine", "drainant", "ventre", "weight"],
  ["immunite", "vitamine", "vitamines", "fatigue", "energie", "tonus"],
  ["dents", "dent", "dentifrice", "buccodentaire", "haleine"],
  ["intime", "intime", "muqueuses"],
  ["mains", "main", "pieds", "pied", "coudes"],
  ["levres", "levre", "levrette"],
];

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Demandes de décision médicale (médicament, antibiotique, posologie,
 * prescription, choix thérapeutique, infection…) : l'assistant ne propose
 * alors aucun produit. Garde-fou déterministe, actif avec ou sans modèle IA.
 * « traitement » seul reste une recherche produit (« traitement anti-chute ») :
 * il n'est bloqué que dans une tournure de décision médicale.
 */
const MEDICAL_REQUEST_RE = new RegExp(
  [
    "\\b(?:antibiotiques?|antibiotherapies?|anti-inflammatoires?|antiviraux|antiviral|antifongiques?)\\b",
    "\\b(?:medicaments?|medocs?|ordonnances?|posologies?|dosages?|surdosage|prescriptions?|prescrire|prescrit)\\b",
    "\\b(?:therapeutiques?|infections?|infecte|infectieu\\w*|fievre|diagnostics?|symptomes?|maladies?|vaccins?)\\b",
    "\\b(?:quel|quelle|quels|quelles) traitements?\\b",
    "\\btraitements? (?:medica\\w*|antibiotiques?|pour (?:une?|la|le|l|cette|ce|mon|ma) (?:infection|maladie|cystite|angine|otite|grippe))\\b",
  ].join("|")
);

/** Signes d'alerte : seulement alors, la réponse mentionne les urgences. */
const URGENT_SIGNS_RE =
  /\b(?:urgences?|urgent|saignements?|saigne|respire mal|difficulte a respirer|douleur (?:thoracique|a la poitrine)|malaise|perte de connaissance|evanoui\w*|convulsions?|forte fievre|fievre elevee|sang)\b/;

export const MEDICAL_SAFETY_REPLY =
  "Je ne peux pas vous conseiller de médicament, d'antibiotique ni de posologie : le bon traitement dépend de votre situation et doit être décidé par un professionnel. Demandez conseil à un pharmacien ou consultez un médecin. Je peux en revanche vous orienter vers des soins de parapharmacie (hygiène, hydratation, protection solaire…).";

export const MEDICAL_URGENT_NOTE =
  "Si les symptômes sont graves ou s'aggravent rapidement, contactez sans attendre les urgences : 141 (SAMU) ou 15 (Protection civile).";

export function detectMedicalRequest(message: string): boolean {
  return MEDICAL_REQUEST_RE.test(normalize(message));
}

/** Réponse de sécurité, avec la mention des urgences uniquement si nécessaire. */
export function buildMedicalSafetyReply(message: string): string {
  return URGENT_SIGNS_RE.test(normalize(message))
    ? `${MEDICAL_SAFETY_REPLY}\n\n${MEDICAL_URGENT_NOTE}`
    : MEDICAL_SAFETY_REPLY;
}

const GROUP_TRIGGER_RE = SYNONYM_GROUPS.map(
  (g) => new RegExp(`\\b(?:${g.join("|")})`, "")
);

export type ChatProductHit = {
  id: number;
  name: string;
  slug: string;
  brand: string | null;
  price: number;
  promoPrice: number | null;
  imageUrl: string | null;
};

/**
 * Extrait les paramètres de recherche du langage naturel :
 * budget (« budget 150 dh », « moins de 200 »), mots-clés pertinents.
 * Les mots-clés sont normalisés sans accents pour la comparaison.
 */
export function parseNeed(message: string): {
  keywords: string[];
  maxPrice?: number;
  minPrice?: number;
} {
  const lower = normalize(message);

  let maxPrice: number | undefined;
  let minPrice: number | undefined;

  const budgetMax = lower.match(/(?:budget|max|maximum|moins de|jusqua|jusqu'a|<)\s*(\d{2,5})/);
  if (budgetMax) maxPrice = parseFloat(budgetMax[1]);

  const budgetMin = lower.match(/(?:min|minimum|plus de|a partir de|au-dessus de|>)\s*(\d{2,5})/);
  if (budgetMin) minPrice = parseFloat(budgetMin[1]);

  // Fourchettes « entre X et Y DH »
  const range = lower.match(/(?:entre|de)\s*(\d{2,5})\s*(?:et|a|jusqua|jusqu'a?)\s*(\d{2,5})/);
  if (range) {
    minPrice = parseFloat(range[1]);
    maxPrice = parseFloat(range[2]);
  }

  if (!maxPrice && !minPrice) {
    const solo = lower.match(/(\d{2,5})\s*(?:dh|dhs|mad)\b/);
    if (solo && /budget|moins|max|environ|autour/.test(lower)) maxPrice = parseFloat(solo[1]);
  }

  const keywords = lower
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w))
    .slice(0, 8);

  return { keywords, maxPrice, minPrice };
}

/** Recherche produits pour le chat : uniquement publiés et disponibles. */
export async function findProductsForChat(message: string, limit = 6): Promise<ChatProductHit[]> {
  const { keywords, maxPrice, minPrice } = parseNeed(message);
  // Sans mot-clé exploitable, on ne recommande rien plutôt que des produits au hasard.
  if (keywords.length === 0) return [];

  const msgN = normalize(message);
  const searchTerms = [
    ...keywords,
    ...SYNONYM_GROUPS.filter((_, gi) => GROUP_TRIGGER_RE[gi].test(msgN)).flat(),
  ].filter((term, i, all) => term.length >= 3 && all.indexOf(term) === i);

  const pool = await db.product.findMany({
    where: {
      status: "PUBLISHED",
      AND: [
        { OR: [{ unlimitedStock: true }, { stock: { gt: 0 } }] },
        // Recherche dans tout le catalogue (pas seulement les meilleures ventes)
        // des fiches qui contiennent réellement le besoin.
        {
          OR: searchTerms.flatMap((term) => [
            { searchText: { contains: term } },
            { name: { contains: term } },
            { brand: { contains: term } },
          ]),
        },
        ...(maxPrice != null || minPrice != null
          ? [{
              price: {
                ...(minPrice != null ? { gte: minPrice } : {}),
                ...(maxPrice != null ? { lte: maxPrice } : {}),
              },
            }]
          : []),
      ],
    },
    orderBy: [{ soldCount: "desc" }, { isFeatured: "desc" }],
    take: 80,
    include: { images: { orderBy: { order: "asc" }, take: 1 } },
  });

  const scored = pool
    .map((p) => {
      const nameN = normalize(p.name);
      const brandN = normalize(p.brand ?? "");
      const shortN = normalize(p.shortDescription ?? "");
      const descN = normalize(p.description ?? "");
      const searchN = p.searchText ?? "";

      let relevance = 0;
      let directHits = 0;
      for (const kw of keywords) {
        if (nameN.includes(kw)) relevance += 3;
        else if (brandN.includes(kw)) relevance += 2;
        else if (shortN.includes(kw)) relevance += 1.5;
        else if (descN.includes(kw)) relevance += 1;
        else if (searchN.includes(kw)) relevance += 1;
        else continue;
        directHits += 1;
      }
      // Boost par groupes de synonymes (ex. « peau sèche » → hydratant…)
      const haystack = `${nameN} ${shortN} ${descN}`;
      GROUP_TRIGGER_RE.forEach((re, gi) => {
        if (!re.test(msgN)) return;
        if (SYNONYM_GROUPS[gi].some((w) => haystack.includes(w))) relevance += 2.5;
      });

      // La popularité départage des fiches pertinentes, jamais plus.
      const score = relevance + (p.promoPrice ? 0.5 : 0) + Math.min(p.soldCount / 20, 1.5);
      return { p, score, directHits };
    })
    // Un synonyme seul ne suffit pas : il faut au moins un mot du besoin.
    .filter(({ directHits }) => directHits > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ p }) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    brand: p.brand,
    price: p.price,
    promoPrice: p.promoPrice,
    imageUrl: p.images[0]?.url ?? null,
  }));
}
