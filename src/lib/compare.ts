/**
 * Comparaison de produits : données structurées + analyse IA (Claude) avec
 * repli local 100 % factuel (aucun argument inventé).
 */

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { normalize } from "@/lib/search/synonyms";
import { logger, newRequestId } from "@/lib/logger";

export type ComparableProduct = {
  slug: string;
  name: string;
  brand: string | null;
  price: number;
  promoPrice: number | null;
  effectivePrice: number;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  rating: number | null;
  reviewsCount: number;
};

export type CompareError = { error: string };

export type CompareFeature = {
  slug: string;
  name: string;
  chips: string[];
};

export type ComparisonSummary = {
  slug: string;
  summary: string;
};

export type ComparisonResult = {
  ai: boolean;
  verdict: string;
  summaries: ComparisonSummary[];
};

/** Recherche les produits par slug (publiés uniquement), file d'attente stricte. */
export async function compareProducts(
  slugs: string[]
): Promise<ComparableProduct[] | CompareError> {
  const requested = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))];
  if (requested.length === 0) {
    return { error: "Aucun produit à comparer." };
  }

  const products = await db.product.findMany({
    where: { slug: { in: requested }, status: "PUBLISHED" },
    include: {
      category: true,
      images: { orderBy: { order: "asc" }, take: 1 },
      reviews: { where: { status: "APPROVED" }, select: { rating: true } },
    },
  });

  const found = new Set(products.map((p) => p.slug));
  const missing = requested.filter((s) => !found.has(s));
  if (missing.length > 0) {
    return { error: `Produit introuvable : ${missing.join(", ")}` };
  }

  return products.map((p) => {
    const reviews = p.reviews;
    return {
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      price: p.price,
      promoPrice: p.promoPrice,
      effectivePrice:
        p.promoPrice != null && p.promoPrice < p.price ? p.promoPrice : p.price,
      category: p.category?.name ?? null,
      description: p.description ?? null,
      imageUrl: p.images[0]?.url ?? null,
      rating:
        reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null,
      reviewsCount: reviews.length,
    };
  });
}

/**
 * Données de comparaison pour l'UI. Les « atouts » (chips) sont dérivées
 * UNIQUEMENT du texte réel des produits (nom + descriptions) : aucun
 * bénéfice inventé.
 */
const CHIP_RULES: { label: string; terms: string[] }[] = [
  { label: "Hydratant", terms: ["hydrat", "nourriss", "nutrition", "confort"] },
  { label: "Peau sèche", terms: ["seche", "secheresse", "dehydrate"] },
  { label: "Purifiant", terms: ["purif", "matif", "imperfection", "boutons", "acne"] },
  { label: "Anti-âge", terms: ["antiage", "anti-age", "rides", "fermete", "lifting", "regener"] },
  { label: "Protection solaire", terms: ["spf", "solaire", "soleil", "uv", "protection"] },
  { label: "Capillaire", terms: ["capillaire", "cheveux", "cuir chevelu", "cuirs"] },
  { label: "Anti-chute", terms: ["chute", "antichute", "densite", "fortifiant"] },
  { label: "Éclat & tonus", terms: ["eclat", "tonus", "energie", "brillance", "lumiere"] },
];

export function buildComparisonData(products: ComparableProduct[]): CompareFeature[] {
  return products.map((p) => {
    const corpus = normalize([p.name, p.description ?? ""].join(" "));
    const chips = CHIP_RULES.filter((rule) => rule.terms.some((t) => corpus.includes(t))).map(
      (rule) => rule.label
    );
    return { slug: p.slug, name: p.name, chips };
  });
}

function buildLocalSummary(p: ComparableProduct): string {
  const parts: string[] = [`Prix ${p.effectivePrice.toFixed(2)} DH`];
  if (p.promoPrice != null && p.promoPrice < p.price) {
    const percent = Math.round(((p.price - p.promoPrice) / p.price) * 100);
    parts.push(`en promotion (-${percent} %)`);
  }
  if (p.rating != null) {
    parts.push(`note ${p.rating.toFixed(1)}/5 (${p.reviewsCount} avis)`);
  }
  if (p.description && p.description.trim()) {
    parts.push("fiche détaillée disponible");
  } else {
    parts.push("fiche sans description détaillée");
  }
  return parts.join(" · ");
}

/** Repli local : classement factuel (prix, promo, note, description). */
export function buildLocalComparison(products: ComparableProduct[]): ComparisonResult {
  const verdictParts: string[] = [];

  const byPrice = [...products].sort((a, b) => a.effectivePrice - b.effectivePrice);
  const cheapest = byPrice[0];
  if (cheapest) {
    verdictParts.push(`Le meilleur prix est « ${cheapest.name} » à ${cheapest.effectivePrice.toFixed(2)} DH.`);
  }

  const promos = products.filter((p) => p.promoPrice != null && p.promoPrice < p.price);
  if (promos.length > 0) {
    verdictParts.push(`${promos.length} produit(s) actuellement en promotion.`);
  }

  const rated = products
    .filter((p) => p.rating != null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const topRated = rated[0];
  if (topRated && topRated.rating != null) {
    verdictParts.push(`« ${topRated.name} » a la meilleure note (${topRated.rating.toFixed(1)}/5).`);
  }

  return {
    ai: false,
    verdict: verdictParts.length > 0 ? verdictParts.join(" ") : "Aucun critère factuel disponible.",
    summaries: products.map((p) => ({ slug: p.slug, summary: buildLocalSummary(p) })),
  };
}

const AI_SYSTEM = `Tu es un comparateur objectif de produits de parapharmacie.
Tu reçois des données factuelles (prix, promotion, note, nombre d'avis, descriptions tronquées).
Tu réponds UNIQUEMENT par un objet JSON strict, sans aucun texte autour, au format :
{"verdict": "2 à 4 phrases en français comparant les produits et recommandant le meilleur rapport qualité/prix", "summaries": [{"slug": "<slug exact du produit>", "summary": "1 à 3 phrases en français, strictement basées sur les données fournies"}]}
Règles strictes : n'invente JAMAIS un prix, une marque, un bénéfice, une propriété ou une note absente des données. La réponse doit être en français.`;

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

function parseAiRaw(raw: string): ComparisonResult | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;

  const obj = data as Record<string, unknown>;
  const verdict = typeof obj.verdict === "string" ? obj.verdict.trim() : "";
  if (!verdict || !Array.isArray(obj.summaries)) return null;

  const summaries: ComparisonSummary[] = [];
  for (const item of obj.summaries) {
    if (typeof item !== "object" || item === null) continue;
    const entry = item as Record<string, unknown>;
    if (typeof entry.slug === "string" && typeof entry.summary === "string") {
      summaries.push({ slug: entry.slug, summary: entry.summary.trim() });
    }
    if (summaries.length >= 4) break;
  }
  if (summaries.length === 0) return null;

  return { ai: true, verdict, summaries };
}

const AI_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";

/**
 * Analyse IA des produits comparés. Sans clé API ou en cas d'erreur, renvoie
 * le repli local factuel. Ne lève jamais.
 */
export async function aiComparison(
  products: ComparableProduct[],
  userNote?: string
): Promise<ComparisonResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return buildLocalComparison(products);

  try {
    const client = new Anthropic({ apiKey, maxRetries: 1 });
    const payload = {
      produits: products.map((p) => ({
        slug: p.slug,
        nom: p.name,
        marque: p.brand,
        prix_dh: p.price,
        prix_promo_dh: p.promoPrice,
        prix_effectif_dh: p.effectivePrice,
        categorie: p.category,
        description: (p.description ?? "").slice(0, 400),
        note: p.rating,
        nb_avis: p.reviewsCount,
      })),
      note_utilisateur: userNote ?? null,
    };

    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1200,
      system: AI_SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(payload) }],
    });

    const textBlock = response.content.find((c) => c.type === "text");
    const text = textBlock?.type === "text" ? textBlock.text : "";
    const parsed = parseAiRaw(extractJson(text));
    return parsed ?? buildLocalComparison(products);
  } catch (err) {
    logger.error("ai", "compare.error", {
      message: "Échec comparaison IA — repli local",
      errorCode: "AI_ERROR",
      requestId: newRequestId(),
      data: { ...(err instanceof Error ? { error: err.message } : {}) },
    });
    return buildLocalComparison(products);
  }
}