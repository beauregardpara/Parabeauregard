import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { normalize, searchTermsForQuery } from "@/lib/search/synonyms";
import { foldForSearch } from "@/lib/product-name";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/security/rate-limit";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, RATE_LIMITS.search);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans quelques instants." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 200);
  if (!q) return NextResponse.json({ query: q, terms: [], suggestions: [] });

  const terms = searchTermsForQuery(q, 16);
  const effectiveTerms = terms.length > 0 ? terms : [normalize(q)];

  const where: Prisma.ProductWhereInput = {
    status: "PUBLISHED",
    // `searchText` est replié (sans accents) : « avene » doit suggérer « Avène ».
    OR: effectiveTerms.flatMap((t) => {
      const folded = foldForSearch(t);
      return [
        ...(folded ? [{ searchText: { contains: folded } }] : []),
        { name: { contains: t } },
        { brand: { contains: t } },
        { shortDescription: { contains: t } },
        { description: { contains: t } },
      ];
    }),
  };

  // On élargit la sélection puis on classe par pertinence : trier uniquement
  // sur les ventes faisait remonter des best-sellers sans rapport avec la
  // requête (« roge cavailles » proposait un soin Eucerin).
  const candidates = await db.product.findMany({
    where,
    orderBy: [{ soldCount: "desc" }, { isFeatured: "desc" }],
    take: 48,
    include: { images: { orderBy: { order: "asc" }, take: 1 } },
  });

  const foldedQuery = foldForSearch(q);
  const compactQuery = foldedQuery.replace(/s+/g, "");
  function relevance(product: { searchText: string | null }): number {
    const text = product.searchText ?? "";
    if (!foldedQuery) return 0;
    if (text.startsWith(foldedQuery)) return 3;
    if (text.includes(foldedQuery)) return 2;
    if (compactQuery && text.includes(compactQuery)) return 1;
    return 0;
  }

  const suggestions = candidates
    .map((product, index) => ({ product, index, score: relevance(product) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 8)
    .map((entry) => entry.product);

  return NextResponse.json({
    query: q,
    terms: effectiveTerms,
    suggestions: suggestions.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      price: p.price,
      promoPrice: p.promoPrice,
      imageUrl: p.images[0]?.url ?? null,
    })),
  });
}