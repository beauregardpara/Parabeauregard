import "server-only";

import { Firecrawl, type SearchData } from "@mendable/firecrawl-js";
import { logger } from "@/lib/logger";
import { filterRelevantCandidates, normalizeCandidates } from "@/lib/reputation/normalize";
import type { ReputationSource } from "@/lib/reputation/types";

export type ScrapedReview = {
  author: string;
  rating: number;
  comment: string;
  date?: string | null;
  verified?: boolean;
};

export type ProductEnrichment = {
  description?: string;
  shortDescription?: string;
  brand?: string;
  reputation: { averageRating: number; reviewsCount: number; reviews: ScrapedReview[] } | null;
};

const DEFAULT_MAX_RESULTS = 10;
const MAX_QUERY_COUNT = 3;

function getClient(): Firecrawl | null {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  return apiKey ? new Firecrawl({ apiKey, timeoutMs: 20_000, maxRetries: 2 }) : null;
}

export function isFirecrawlConfigured(): boolean {
  return Boolean(process.env.FIRECRAWL_API_KEY?.trim());
}

function resultCandidates(data: SearchData): Array<{ url: string; title?: string; excerpt?: string }> {
  const web = Array.isArray(data.web) ? data.web : [];
  const news = Array.isArray(data.news) ? data.news : [];
  return [...web, ...news].flatMap((item) => {
    if (!item || typeof item !== "object" || !("url" in item)) return [];
    const candidate = item as { url?: unknown; title?: unknown; description?: unknown; snippet?: unknown };
    if (typeof candidate.url !== "string") return [];
    return [{
      url: candidate.url,
      title: typeof candidate.title === "string" ? candidate.title : undefined,
      excerpt: typeof candidate.description === "string" ? candidate.description : typeof candidate.snippet === "string" ? candidate.snippet : undefined,
    }];
  });
}

function buildQueries(productName: string, brand?: string | null): string[] {
  const subject = [brand, productName].filter(Boolean).join(" ").trim();
  if (!subject) return [];
  return [`${subject} avis`, `${subject} review`, `${subject} expérience Maroc`];
}

/** Recherche limitée et server-side : aucune clé ni réponse Firecrawl ne part au navigateur. */
export async function searchProductReputation(productName: string, brand?: string | null): Promise<ReputationSource[]> {
  const client = getClient();
  if (!client) return [];
  const queries = buildQueries(productName, brand).slice(0, MAX_QUERY_COUNT);
  const limit = Math.min(Math.max(Number(process.env.REPUTATION_MAX_SEARCH_RESULTS ?? DEFAULT_MAX_RESULTS), 1), 20);
  const all: Array<{ url: string; title?: string; excerpt?: string }> = [];
  const started = Date.now();
  try {
    for (const query of queries) {
      const result = await client.search(query, {
        limit,
        sources: ["web", "news"],
        location: "Morocco",
        highlights: true,
      });
      all.push(...resultCandidates(result));
    }
    const sources = normalizeCandidates(filterRelevantCandidates(all, productName, brand)).slice(0, limit);
    logger.info("reputation", "firecrawl.search_complete", {
      data: { queryCount: queries.length, resultCount: sources.length, durationMs: Date.now() - started },
    });
    return sources;
  } catch (error) {
    logger.error("reputation", "firecrawl.search_failed", {
      data: { queryCount: queries.length, durationMs: Date.now() - started, error: error instanceof Error ? error.message : "Erreur inconnue" },
    });
    return [];
  }
}

/** Compatibilité avec le script d'enrichissement historique. */
export async function enrichProductFromSource(_sourceUrl: string, productName: string): Promise<ProductEnrichment | null> {
  const sources = await searchProductReputation(productName);
  if (!sources.length) return { reputation: null };
  const reviews = sources.map((source) => ({
    author: source.domain,
    rating: source.sentiment === "POSITIVE" ? 4 : source.sentiment === "NEGATIVE" ? 2 : 3,
    comment: source.excerpt,
    date: source.publishedAt,
    verified: false,
  }));
  return { reputation: { averageRating: reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length, reviewsCount: reviews.length, reviews } };
}
