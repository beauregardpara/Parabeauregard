import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { searchTermsForQuery, searchWordGroupsForQuery } from "@/lib/search/synonyms";
import { foldForSearch } from "@/lib/product-name";
import { productTextWhere } from "@/lib/search/text-filter";
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

  const effectiveTerms = searchTermsForQuery(q, 16);

  // On élargit la sélection puis on classe par pertinence : trier uniquement
  // sur les ventes faisait remonter des best-sellers sans rapport avec la
  // requête (« roge cavailles » proposait un soin Eucerin).
  const fetch = (where: Prisma.ProductWhereInput) =>
    db.product.findMany({
      where: { status: "PUBLISHED", ...where },
      orderBy: [{ soldCount: "desc" }, { isFeatured: "desc" }],
      take: 48,
      include: { images: { orderBy: { order: "asc" }, take: 1 } },
    });

  // D'abord les fiches contenant *tous* les mots saisis, dans n'importe quel
  // ordre ; à défaut seulement, celles qui n'en contiennent qu'une partie.
  const strict = productTextWhere(q, "strict");
  let candidates = strict ? await fetch(strict) : [];
  if (candidates.length === 0) {
    const loose = productTextWhere(q, "loose");
    if (loose) candidates = await fetch(loose);
  }

  const foldedQuery = foldForSearch(q);
  // Variante sans espaces : « l oreal » doit aussi remonter en tapant « loreal ».
  const compactQuery = foldedQuery.replace(/\s+/g, "");
  // Les mots saisis, sans leurs synonymes : un synonyme aide a trouver la fiche,
  // pas a la classer devant une fiche qui porte le mot exact.
  const mots = searchWordGroupsForQuery(q).map((groupe) => groupe[0]);

  /**
   * Classe une suggestion. Depuis que les mots peuvent etre saisis dans
   * n'importe quel ordre, la requete entiere ne se retrouve plus telle quelle
   * dans la fiche : sans le palier « tous les mots dans le nom », une fiche dont
   * seul le descriptif mentionne les mots passait devant le produit cherche.
   */
  function relevance(product: { name: string; brand: string | null; searchText: string | null }): number {
    const text = product.searchText ?? "";
    if (!foldedQuery) return 0;
    if (text.startsWith(foldedQuery)) return 5;
    if (text.includes(foldedQuery)) return 4;

    const intitule = foldForSearch(`${product.brand ?? ""} ${product.name}`);
    if (mots.length > 0 && mots.every((mot) => intitule.includes(mot))) return 3;
    if (mots.length > 0 && mots.some((mot) => intitule.includes(mot))) return 2;
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