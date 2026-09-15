import type { ReputationCandidate, ReputationSentiment, ReputationSource } from "./types";

const PRIVATE_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
const GENERIC_PRODUCT_TERMS = new Set([
  "avec", "apres", "anti", "baume", "beauté", "beauty", "corps", "creme", "crème", "de", "des", "du", "en",
  "exfoliant", "gel", "gommage", "homme", "la", "le", "les", "ml", "peau", "pour", "produit", "serum", "soin", "soins", "visage",
]);

function searchText(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR");
}

function terms(value: string | null | undefined): string[] {
  return searchText(value).split(/[^a-z0-9]+/).filter((term) => term.length >= 3);
}

/** Rejects generic, empty or clearly mismatched search results before scoring. */
export function filterRelevantCandidates(candidates: ReputationCandidate[], productName: string, brand?: string | null): ReputationCandidate[] {
  const brandTerms = [...new Set(terms(brand).filter((term) => !GENERIC_PRODUCT_TERMS.has(term)))];
  const productTerms = [...new Set(terms(productName).filter((term) => !GENERIC_PRODUCT_TERMS.has(term) && !brandTerms.includes(term)))];
  const minimumMatches = Math.min(2, Math.max(1, productTerms.length));

  return candidates.filter((candidate) => {
    if (!String(candidate.excerpt ?? "").trim()) return false;
    // Search snippets can echo the query itself. Match product identity only
    // against the result title and URL to avoid admitting generic pages.
    const haystack = searchText(`${candidate.title ?? ""} ${candidate.url}`);
    const haystackTerms = new Set(terms(haystack));
    const brandMatches = brandTerms.length === 0 || brandTerms.every((term) => haystackTerms.has(term));
    const productMatches = productTerms.filter((term) => haystackTerms.has(term)).length;
    const productTypeConflict = terms(productName).includes("creme") && haystackTerms.has("serum") && !haystackTerms.has("creme");
    return brandMatches && !productTypeConflict && productMatches >= minimumMatches;
  });
}

export function safePublicHttpUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (PRIVATE_HOSTS.has(host) || host.endsWith(".localhost")) return null;
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(host)) return null;
    return url;
  } catch {
    return null;
  }
}

export function canonicalUrl(raw: string): string | null {
  const url = safePublicHttpUrl(raw);
  if (!url) return null;
  url.hostname = url.hostname.replace(/^www\./i, "");
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$|ref$|srsltid$)/i.test(key)) url.searchParams.delete(key);
  }
  return url.toString().replace(/\/$/, "");
}

export function detectLanguage(text: string): ReputationSource["language"] {
  if (/\b(le|la|les|avec|pour|très|efficace|agréable)\b/i.test(text)) return "fr";
  if (/\b(the|with|for|very|effective|pleasant)\b/i.test(text)) return "en";
  if (/[\u0600-\u06ff]/.test(text)) return "ar";
  return "unknown";
}

const POSITIVE = ["excellent", "efficace", "agréable", "hydrat", "satisfait", "recommande", "love", "great", "good", "soft", "smooth"];
const NEGATIVE = ["décev", "irrit", "cher", "problème", "mauvais", "déçu", "sticky", "expensive", "poor", "bad"];

export function classifySentiment(text: string): ReputationSentiment {
  const value = text.toLocaleLowerCase("fr-FR");
  const positive = POSITIVE.reduce((count, word) => count + Number(value.includes(word)), 0);
  const negative = NEGATIVE.reduce((count, word) => count + Number(value.includes(word)), 0);
  if (positive === negative) return "NEUTRAL";
  return positive > negative ? "POSITIVE" : "NEGATIVE";
}

export function normalizeCandidates(candidates: ReputationCandidate[], now = new Date()): ReputationSource[] {
  const seenUrls = new Set<string>();
  const seenFingerprints = new Set<string>();
  const sources: ReputationSource[] = [];
  for (const candidate of candidates) {
    const url = canonicalUrl(candidate.url);
    if (!url) continue;
    const parsed = new URL(url);
    const excerpt = String(candidate.excerpt ?? "").replace(/\s+/g, " ").trim().slice(0, 500);
    const fingerprint = `${parsed.hostname.toLowerCase()}|${(candidate.title ?? "").toLowerCase().replace(/\W+/g, " ").trim()}|${excerpt.toLowerCase().slice(0, 120)}`;
    if (seenUrls.has(url) || seenFingerprints.has(fingerprint)) continue;
    seenUrls.add(url);
    seenFingerprints.add(fingerprint);
    sources.push({
      url,
      domain: parsed.hostname.replace(/^www\./, ""),
      title: String(candidate.title ?? parsed.hostname).trim().slice(0, 180),
      publishedAt: candidate.publishedAt ?? null,
      retrievedAt: now.toISOString(),
      language: detectLanguage(excerpt),
      excerpt,
      sentiment: classifySentiment(excerpt),
    });
  }
  return sources;
}
