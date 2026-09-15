import { db } from "@/lib/db";
import { confidenceForSources, extractHighlights, percentages, reputationLabel } from "./scoring";
import type { ReputationSnapshot, ReputationSource } from "./types";

const DEFAULT_TTL_DAYS = 7;

function parseArray<T>(value: string | null | undefined): T[] {
  try {
    const parsed = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

export function reputationEnabled(): boolean {
  return process.env.REPUTATION_ENABLED !== "false";
}

export function reputationTtlDays(): number {
  const value = Number(process.env.REPUTATION_CACHE_DAYS ?? DEFAULT_TTL_DAYS);
  return Number.isFinite(value) && value > 0 && value <= 90 ? value : DEFAULT_TTL_DAYS;
}

export function snapshotFromRow(row: {
  status: string; label: string | null; confidence: string | null; positivePercent: number | null; neutralPercent: number | null; negativePercent: number | null;
  totalSources: number; totalMentions: number; summary: string | null; positivesJson: string; negativesJson: string; sourcesJson: string; generatedAt: Date | null; expiresAt: Date | null; lastError: string | null;
}): ReputationSnapshot {
  return {
    status: row.status === "READY" || row.status === "STALE" || row.status === "ERROR" ? row.status : "EMPTY",
    label: row.label,
    confidence: row.confidence === "LOW" || row.confidence === "MEDIUM" || row.confidence === "HIGH" ? row.confidence : null,
    positivePercent: row.positivePercent ?? 0,
    neutralPercent: row.neutralPercent ?? 0,
    negativePercent: row.negativePercent ?? 0,
    totalSources: row.totalSources,
    totalMentions: row.totalMentions,
    summary: row.summary,
    positives: parseArray<string>(row.positivesJson),
    negatives: parseArray<string>(row.negativesJson),
    sources: parseArray<ReputationSource>(row.sourcesJson),
    generatedAt: row.generatedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    lastError: row.lastError,
  };
}

export async function getProductReputation(productId: number): Promise<ReputationSnapshot | null> {
  if (!reputationEnabled()) return null;
  const row = await db.productReputation.findUnique({ where: { productId } });
  if (!row) {
    return {
      status: "EMPTY",
      label: null,
      confidence: null,
      positivePercent: 0,
      neutralPercent: 0,
      negativePercent: 0,
      totalSources: 0,
      totalMentions: 0,
      summary: null,
      positives: [],
      negatives: [],
      sources: [],
      generatedAt: null,
      expiresAt: null,
      lastError: null,
    };
  }
  const snapshot = snapshotFromRow(row);
  if (snapshot.status === "READY" && snapshot.expiresAt && new Date(snapshot.expiresAt) < new Date()) snapshot.status = "STALE";
  return snapshot;
}

export async function saveProductReputation(productId: number, sources: ReputationSource[], summary?: string | null) {
  const now = new Date();
  const expiry = new Date(now.getTime() + reputationTtlDays() * 86_400_000);
  const parts = percentages(sources);
  const highlights = extractHighlights(sources);
  const data = {
    status: sources.length ? "READY" : "EMPTY",
    label: reputationLabel(sources),
    confidence: confidenceForSources(sources),
    positivePercent: parts.positive,
    neutralPercent: parts.neutral,
    negativePercent: parts.negative,
    totalSources: sources.length,
    totalMentions: sources.length,
    summary: summary ?? (sources.length ? "Synthèse basée sur des sources publiques observées sur le web." : null),
    positivesJson: JSON.stringify(highlights.positives),
    negativesJson: JSON.stringify(highlights.negatives),
    sourcesJson: JSON.stringify(sources),
    generatedAt: sources.length ? now : null,
    expiresAt: sources.length ? expiry : null,
    lastError: null,
    lastScrapedAt: now,
  };
  const row = await db.productReputation.upsert({ where: { productId }, create: { productId, ...data }, update: data });
  return snapshotFromRow(row);
}
