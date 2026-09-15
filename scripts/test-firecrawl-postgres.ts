import { db } from "@/lib/db";
import { Firecrawl, type SearchData } from "@mendable/firecrawl-js";
import { saveProductReputation } from "@/lib/reputation";
import { filterRelevantCandidates, normalizeCandidates } from "@/lib/reputation/normalize";

const PRODUCT_IDS = [1172, 1241, 1347];
const MAX_QUERIES = 3;

function candidates(data: SearchData) {
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

async function searchProductReputation(client: Firecrawl, name: string, brand: string | null) {
  const subject = [brand, name].filter(Boolean).join(" ").trim();
  const queries = [`${subject} avis`].slice(0, MAX_QUERIES);
  const all = [];
  for (const query of queries) {
    const result = await client.search(query, { limit: 10, sources: ["web", "news"], location: "Morocco", highlights: true });
    all.push(...candidates(result));
  }
  return normalizeCandidates(filterRelevantCandidates(all, name, brand)).slice(0, 10);
}

async function main() {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) throw new Error("Firecrawl is not configured.");
  const client = new Firecrawl({ apiKey, timeoutMs: 20_000, maxRetries: 1 });
  const products = await db.product.findMany({
    where: { id: { in: PRODUCT_IDS } },
    select: { id: true, name: true, brand: true },
    orderBy: { id: "asc" },
  });
  if (products.length !== PRODUCT_IDS.length) {
    throw new Error("The three audited products were not found.");
  }

  const results = [];
  for (const product of products) {
    const sources = await searchProductReputation(client, product.name, product.brand);
    const snapshot = await saveProductReputation(product.id, sources);
    results.push({
      productId: product.id,
      productName: product.name,
      sourceCount: sources.length,
      sources: sources.map((source) => ({ domain: source.domain, title: source.title, url: source.url })),
      status: snapshot.status,
      confidence: snapshot.confidence,
      label: snapshot.label,
    });
  }

  console.log(JSON.stringify({ analyzedProducts: results.length, results }, null, 2));
}

main().finally(() => db.$disconnect());
