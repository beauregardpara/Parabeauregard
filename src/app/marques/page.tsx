import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getBrands } from "@/lib/search";
import { slugify } from "@/lib/format";

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "Nos marques — Para Beauregard" },
  description:
    "Retrouvez toutes les marques de parapharmacie disponibles chez Para Beauregard : produits authentiques, livrés partout au Maroc.",
  alternates: { canonical: "/marques" },
};

export default async function MarquesPage() {
  const [brands, grouped] = await Promise.all([
    getBrands(),
    db.product.groupBy({
      by: ["brand"],
      where: { status: "PUBLISHED", brand: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const countsBySlug = new Map<string, number>();
  for (const row of grouped) {
    if (!row.brand) continue;
    const key = slugify(row.brand);
    countsBySlug.set(key, (countsBySlug.get(key) ?? 0) + row._count._all);
  }

  const seen = new Set<string>();
  const cards = brands.flatMap((brand) => {
    const slug = slugify(brand);
    if (!slug || seen.has(slug)) return [];
    seen.add(slug);
    return [{ brand, slug, count: countsBySlug.get(slug) ?? 0 }];
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav aria-label="Fil d'ariane" className="mb-4 text-xs text-slate-500">
        <Link href="/" className="hover:text-para-700">Accueil</Link>
        <span className="mx-1.5">/</span>
        <span className="font-semibold text-para-800">Nos marques</span>
      </nav>

      <header className="mb-10">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-para-500">Toutes les marques</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-para-950 sm:text-4xl">Nos marques</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Les marques de parapharmacie que nous sélectionnons, avec leurs produits disponibles dans notre catalogue.
        </p>
      </header>

      {cards.length === 0 ? (
        <div className="grid place-items-center rounded-3xl border border-dashed border-para-200 bg-mint/40 py-24 text-center">
          <span className="text-5xl" aria-hidden>🧴</span>
          <p className="mt-4 font-display text-lg font-bold text-para-900">Aucune marque disponible</p>
          <p className="mt-1 text-sm text-slate-500">
            Notre catalogue s'enrichit chaque semaine — revenez bientôt !
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ brand, slug, count }) => (
            <Link
              key={slug}
              href={`/marques/${slug}`}
              className="shine-card group relative flex items-center gap-5 overflow-hidden rounded-3xl border border-para-100 bg-gradient-to-br from-white to-mint p-6 shadow-[var(--shadow-card)] transition-shadow hover:shadow-lift"
            >
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-para-500 to-para-700 font-display text-2xl font-extrabold text-white shadow-soft transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                {brand.charAt(0)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display text-lg font-bold text-para-900">{brand}</span>
                <span className="mt-0.5 block text-sm text-slate-500">
                  {count} produit{count > 1 ? "s" : ""}
                </span>
              </span>
              <span aria-hidden className="ml-auto text-para-500 transition-transform duration-300 group-hover:translate-x-1.5">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}