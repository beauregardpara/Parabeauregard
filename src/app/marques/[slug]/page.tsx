import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getBrands, searchProducts } from "@/lib/search";
import { slugify } from "@/lib/format";
import { ProductCard } from "@/components/product-card";

export const revalidate = 60;

function decodeSlug(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function findBrandBySlug(rawSlug: string): Promise<string | null> {
  const target = slugify(decodeSlug(rawSlug));
  if (!target) return null;
  const brands = await getBrands();
  return brands.find((b) => slugify(b) === target) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brand = await findBrandBySlug(slug);
  if (!brand) return {};
  return {
    title: brand,
    description: `Découvrez toute la gamme ${brand} chez Para Beauregard : produits authentiques au meilleur prix, livrés partout au Maroc.`,
    alternates: { canonical: `/marques/${slugify(brand)}` },
  };
}

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const brand = await findBrandBySlug(slug);
  if (!brand) notFound();

  const sp = await searchParams;
  const page = sp.page ? parseInt(sp.page, 10) : 1;
  const result = await searchProducts({ brands: [brand], perPage: 12, page });

  const qs = (n: number) => `/marques/${slugify(brand)}${n > 1 ? `?page=${n}` : ""}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav aria-label="Fil d'ariane" className="mb-4 text-xs text-slate-500">
        <Link href="/" className="hover:text-para-700">Accueil</Link>
        <span className="mx-1.5">/</span>
        <Link href="/marques" className="hover:text-para-700">Nos marques</Link>
        <span className="mx-1.5">/</span>
        <span className="font-semibold text-para-800">{brand}</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-para-500">Marque</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-para-950 sm:text-4xl">{brand}</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Tous les produits {brand} disponibles chez Para Beauregard, livrés partout au Maroc.
        </p>
        <p className="mt-2 text-sm text-slate-400">{result.total} produit(s)</p>
      </header>

      {result.items.length === 0 ? (
        <div className="grid place-items-center rounded-3xl border border-dashed border-para-200 bg-mint/40 py-24 text-center">
          <span className="text-5xl" aria-hidden>🔍</span>
          <p className="mt-4 font-display text-lg font-bold text-para-900">Aucun produit trouvé</p>
          <p className="mt-1 text-sm text-slate-500">
            Essayez d'élargir vos critères ou explorez une autre marque.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
            {result.items.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>

          {result.pages > 1 && (
            <nav className="mt-10 flex justify-center gap-2" aria-label="Pagination">
              {Array.from({ length: result.pages }, (_, i) => i + 1).map((n) => (
                <a
                  key={n}
                  href={qs(n)}
                  className={`btn-3d grid h-10 w-10 place-items-center rounded-full text-sm font-bold transition ${
                    n === result.page
                      ? "bg-gradient-to-r from-para-600 to-para-700 text-white shadow"
                      : "border border-para-200 bg-white text-para-800 hover:bg-mint"
                  }`}
                  aria-current={n === result.page ? "page" : undefined}
                >
                  {n}
                </a>
              ))}
            </nav>
          )}
        </>
      )}
    </div>
  );
}