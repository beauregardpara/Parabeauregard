import "dotenv/config";
import { Firecrawl } from "@mendable/firecrawl-js";

const key = process.env.FIRECRAWL_API_KEY?.trim();
if (!key) {
  console.error("FIRECRAWL_API_KEY manquante");
  process.exit(1);
}

async function main() {
  const client = new Firecrawl({ apiKey: key, timeoutMs: 20_000, maxRetries: 1 });
  const query = "Guinot Longue Vie crème jeunesse avis";
  const result = await client.search(query, { limit: 3, sources: ["web"], location: "Morocco", highlights: true });
  const results = Array.isArray(result.web) ? result.web : [];
  const domains = results.map((item) => {
    try { return new URL((item as { url: string }).url).hostname.replace(/^www\./, ""); } catch { return "unknown"; }
  });
  console.log(JSON.stringify({ ok: true, query, resultCount: results.length, domains }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Firecrawl validation failed");
  process.exit(1);
});
