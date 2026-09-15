export type ReputationSentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";
export type ReputationConfidence = "LOW" | "MEDIUM" | "HIGH";

export type ReputationSource = {
  url: string;
  domain: string;
  title: string;
  publishedAt: string | null;
  retrievedAt: string;
  language: "fr" | "en" | "ar" | "unknown";
  excerpt: string;
  sentiment: ReputationSentiment;
};

export type ReputationSnapshot = {
  status: "EMPTY" | "READY" | "STALE" | "ERROR";
  label: string | null;
  confidence: ReputationConfidence | null;
  positivePercent: number;
  neutralPercent: number;
  negativePercent: number;
  totalSources: number;
  totalMentions: number;
  summary: string | null;
  positives: string[];
  negatives: string[];
  sources: ReputationSource[];
  generatedAt: string | null;
  expiresAt: string | null;
  lastError: string | null;
};

export type ReputationCandidate = {
  url: string;
  title?: string | null;
  excerpt?: string | null;
  publishedAt?: string | null;
};
