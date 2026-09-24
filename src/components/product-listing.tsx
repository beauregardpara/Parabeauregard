import Link from "next/link";
import { db } from "@/lib/db";
import { getBrands, searchProducts } from "@/lib/search";
import { Filters } from "@/components/filters";
import { ProductCard } from "@/components/product-card";
import { RETURN_DAYS } from "@/lib/constants";
import { paginationItems } from "@/lib/pagination";
import { pageSizeChoices, parsePageSize, SHOP_PAGE_SIZES } from "@/lib/page-size";

export type ListingParams = {
  marque?: string | string[];
  min?: string;
  max?: string;
  dispo?: string;
  promo?: string;
  tri?: string;
  page?: string;
  q?: string;
  /** Nombre de produits par page : une des valeurs proposées, ou « tout ». */
  parPage?: string;
};

export async function ProductListing({
  categorySlug,
  searchParams,
  basePath,
  title,
  subtitle,
  onlyRecent = false,
  bannerIcon,
}: {
  categorySlug?: string;
  searchParams: Promise<ListingParams>;
  basePath: string;
  title: string;
  subtitle?: string;
  onlyRecent?: boolean;
  /** Émoji illustrant le rayon, affiché dans la bande d'en-tête. */
  bannerIcon?: string | null;
}) {
  const sp = await searchParams;
  const brandsParam = Array.isArray(sp.marque) ? sp.marque : sp.marque ? [sp.marque] : [];
  const { perPage, isAll, param: perPageParam } = parsePageSize(sp.parPage, SHOP_PAGE_SIZES, 12);

  const [result, allBrands] = await Promise.all([
    searchProducts({
      q: sp.q,
      categorySlug,
      brands: brandsParam,
      minPrice: sp.min ? parseFloat(sp.min) : undefined,
      maxPrice: sp.max ? parseFloat(sp.max) : undefined,
      inStockOnly: sp.dispo === "1",
      onSaleOnly: sp.promo === "1",
      onlyRecent,
      sort: (sp.tri as "recent" | "price-asc" | "price-desc" | "popular" | "name") ?? "recent",
      page: isAll ? 1 : sp.page ? parseInt(sp.page) : 1,
      perPage,
    }),
    getBrands(),
  ]);

  const qs = (page: number) => {
    const p = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => {
      if (k === "page" || v == null) return;
      if (Array.isArray(v)) v.forEach((x) => p.append(k, x));
      else p.set(k, String(v));
    });
    p.set("page", String(page));
    return `${basePath}?${p.toString()}`;
  };

  /** Lien changeant le nombre par page ; on repart de la première page. */
  const qsPerPage = (value: string) => {
    const p = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => {
      if (k === "page" || k === "parPage" || v == null) return;
      if (Array.isArray(v)) v.forEach((x) => p.append(k, x));
      else p.set(k, String(v));
    });
    p.set("parPage", value);
    return `${basePath}?${p.toString()}`;
  };
  const choices = pageSizeChoices(SHOP_PAGE_SIZES, result.total);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav aria-label="Fil d'ariane" className="mb-4 text-xs text-slate-500">
        <Link href="/" className="hover:text-para-700">Accueil</Link>
        <span className="mx-1.5">/</span>
        <span className="font-semibold text-para-800">{title}</span>
      </nav>

      <header className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-para-950 sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-slate-600">{subtitle}</p>}
        <p className="mt-2 text-sm text-slate-500">{result.total} produit(s)</p>
      </header>

      {/* Bande d'en-tête : identité Para Beauregard, sans visuel de produit
          fictif. Purement décorative, donc masquée aux lecteurs d'écran. */}
      <div
        aria-hidden
        className="mb-10 flex items-center gap-5 overflow-hidden rounded-3xl border border-para-100 bg-gradient-to-r from-para-50 via-mint to-white px-6 py-6 shadow-[var(--shadow-card)] sm:px-10 sm:py-8"
      >
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-3xl shadow-sm sm:h-16 sm:w-16 sm:text-4xl">
          {bannerIcon ?? "🧴"}
        </span>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-para-800 sm:text-sm">
          <li>✓ Produits authentiques</li>
          <li>✓ Paiement à la livraison</li>
          <li>✓ Livraison partout au Maroc</li>
          <li>✓ Retour sous {RETURN_DAYS} jours</li>
        </ul>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <Filters brands={allBrands} basePath={basePath} />
        </aside>

        <div>
          {result.items.length === 0 ? (
            <div className="grid place-items-center rounded-3xl border border-dashed border-para-200 bg-mint/40 py-24 text-center">
              <span className="text-5xl" aria-hidden>🔍</span>
              <p className="mt-4 font-display text-lg font-bold text-para-900">Aucun produit trouvé</p>
              <p className="mt-1 text-sm text-slate-500">Essayez d'élargir vos filtres ou explorez une autre catégorie.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-end gap-2 text-xs text-slate-500">
                <span>Produits par page :</span>
                {choices.map((c) => {
                  const actif = c.param === perPageParam;
                  return (
                    <a
                      key={c.param}
                      href={qsPerPage(c.param)}
                      aria-current={actif ? "true" : undefined}
                      className={`rounded-full border px-3 py-1 font-semibold transition ${
                        actif
                          ? "border-para-600 bg-para-700 text-white"
                          : "border-para-200 bg-white text-para-800 hover:bg-mint"
                      }`}
                    >
                      {c.label}
                    </a>
                  );
                })}
              </div>
              {isAll && result.total > 200 && (
                <p className="mb-4 text-right text-[11px] text-slate-500">
                  {result.total} produits chargés d’un coup : l’affichage peut être lent en mobile.
                </p>
              )}

              <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
                {result.items.map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>

              {result.pages > 1 && (
                <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
                  {result.page > 1 && (
                    <a
                      href={qs(result.page - 1)}
                      rel="prev"
                      className="btn-3d grid h-10 min-w-10 place-items-center rounded-full border border-para-200 bg-white px-3 text-sm font-bold text-para-800 transition hover:bg-mint"
                    >
                      <span aria-hidden>←</span>
                      <span className="sr-only">Page précédente</span>
                    </a>
                  )}
                  {paginationItems(result.page, result.pages).map((item, i) =>
                    item === "…" ? (
                      <span key={`gap-${i}`} aria-hidden className="px-1 text-slate-500">
                        …
                      </span>
                    ) : (
                      <a
                        key={item}
                        href={qs(item)}
                        className={`btn-3d grid h-10 w-10 place-items-center rounded-full text-sm font-bold transition ${
                          item === result.page
                            ? "bg-gradient-to-r from-para-600 to-para-700 text-white shadow"
                            : "border border-para-200 bg-white text-para-800 hover:bg-mint"
                        }`}
                        aria-current={item === result.page ? "page" : undefined}
                        aria-label={`Page ${item}`}
                      >
                        {item}
                      </a>
                    )
                  )}
                  {result.page < result.pages && (
                    <a
                      href={qs(result.page + 1)}
                      rel="next"
                      className="btn-3d grid h-10 min-w-10 place-items-center rounded-full border border-para-200 bg-white px-3 text-sm font-bold text-para-800 transition hover:bg-mint"
                    >
                      <span aria-hidden>→</span>
                      <span className="sr-only">Page suivante</span>
                    </a>
                  )}
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export async function getCategoryBreadcrumb(slug: string) {
  const cat = await db.category.findUnique({ where: { slug }, include: { parent: true } });
  return cat;
}
