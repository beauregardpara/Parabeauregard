import { db } from "@/lib/db";

/** Mots courants à ignorer lors de l'extraction de mots-clés. */
const STOPWORDS = new Set([
  "je", "cherche", "cherches", "veux", "voudrais", "aimerais", "besoin", "pour", "avec", "sans",
  "une", "un", "des", "du", "de", "la", "le", "les", "mon", "ma", "mes", "son", "sa", "ses",
  "produit", "produits", "article", "articles", "budget", "prix", "moins", "que", "qui",
  "est", "suis", "avoir", "femme", "homme", "enfant",
  "dh", "dhs", "mad", "euros", "merci", "svp", "bonjour", "salut", "hello",
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

  const pool = await db.product.findMany({
    where: {
      status: "PUBLISHED",
      AND: [
        { OR: [{ unlimitedStock: true }, { stock: { gt: 0 } }] },
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

  // Le budget seul ne doit jamais suffire : sans mot-clé on garde les plus vendus.
  const hasKeywords = keywords.length > 0;
  const msgN = normalize(message);

  const scored = pool
    .map((p) => {
      const nameN = normalize(p.name);
      const brandN = normalize(p.brand ?? "");
      const shortN = normalize(p.shortDescription ?? "");
      const descN = normalize(p.description ?? "");

      let score = 0;
      if (hasKeywords) {
        for (const kw of keywords) {
          if (nameN.includes(kw)) score += 3;
          else if (brandN.includes(kw)) score += 2;
          else if (shortN.includes(kw)) score += 1.5;
          else if (descN.includes(kw)) score += 1;
        }
        // Boost par groupes de synonymes (ex. « peau sèche » → hydratant…)
        const haystack = `${nameN} ${shortN} ${descN}`;
        GROUP_TRIGGER_RE.forEach((re, gi) => {
          if (!re.test(msgN)) return;
          if (SYNONYM_GROUPS[gi].some((w) => haystack.includes(w))) score += 2.5;
        });
      } else {
        score += 1;
      }

      score += (p.promoPrice ? 0.5 : 0) + Math.min(p.soldCount / 20, 1.5);

      return { p, score };
    })
    .filter(({ score }) => hasKeywords || score > 1)
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
