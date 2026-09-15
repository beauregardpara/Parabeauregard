import type { ReputationConfidence, ReputationSource } from "./types";

export function confidenceForSources(sources: ReputationSource[]): ReputationConfidence | null {
  if (sources.length === 0) return null;
  const domains = new Set(sources.map((source) => source.domain));
  if (domains.size >= 8) return "HIGH";
  if (domains.size >= 3) return "MEDIUM";
  return "LOW";
}

export function percentages(sources: ReputationSource[]) {
  if (sources.length === 0) return { positive: 0, neutral: 0, negative: 0 };
  const counts = {
    positive: sources.filter((source) => source.sentiment === "POSITIVE").length,
    neutral: sources.filter((source) => source.sentiment === "NEUTRAL").length,
    negative: sources.filter((source) => source.sentiment === "NEGATIVE").length,
  };
  const positive = Math.round((counts.positive / sources.length) * 100);
  const negative = Math.round((counts.negative / sources.length) * 100);
  return { positive, neutral: Math.max(0, 100 - positive - negative), negative };
}

export function reputationLabel(sources: ReputationSource[]): string | null {
  if (sources.length === 0) return null;
  const ratio = sources.filter((source) => source.sentiment === "POSITIVE").length / sources.length;
  if (sources.length < 3) return "Peu documentée";
  if (ratio >= 0.7) return "Très positive";
  if (ratio >= 0.55) return "Positive";
  return "Mitigée";
}

export function extractHighlights(sources: ReputationSource[]) {
  const positives = sources.filter((source) => source.sentiment === "POSITIVE").map((source) => source.excerpt).filter(Boolean).slice(0, 3);
  const negatives = sources.filter((source) => source.sentiment === "NEGATIVE").map((source) => source.excerpt).filter(Boolean).slice(0, 3);
  return { positives, negatives };
}
