"use client";

import Link from "next/link";
import { useFavorites } from "@/lib/favorites-context";
import ProductImage from "@/components/product-image";
import { formatPrice } from "@/lib/format";

export function FavoritesSection() {
  const { list, remove, clear } = useFavorites();

  if (list.length === 0) return null;

  return (
    <section className="mt-8 rounded-3xl border border-para-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-para-50 px-6 py-4">
        <h2 className="font-display text-lg font-bold text-para-900">
          Mes favoris <span className="text-slate-500">({list.length})</span>
        </h2>
        <button onClick={clear} className="text-xs font-semibold text-red-500 hover:underline">
          Tout vider
        </button>
      </div>
      <ul className="divide-y divide-para-50">
        {list.map((f) => (
          <li key={f.productId} className="flex items-center gap-4 px-6 py-4">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-mint">
              <ProductImage src={f.imageUrl} alt={f.name} fill fallbackSeed={f.name} sizes="56px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/produits/${f.slug}`} className="font-bold text-para-800 hover:underline">
                {f.name}
              </Link>
              <p className="text-xs text-slate-500">
                {f.brand ?? ""}
                {f.rating ? ` · ${f.rating.toFixed(1)}/5` : ""}
              </p>
              <p className="text-sm font-bold text-para-700">{formatPrice(f.promoPrice ?? f.price)}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/produits/${f.slug}`}
                className="rounded-full bg-gradient-to-r from-para-500 to-para-700 px-4 py-2 text-xs font-semibold text-white"
              >
                Voir
              </Link>
              <button
                onClick={() => remove(f.productId)}
                aria-label={`Retirer ${f.name} des favoris`}
                className="rounded-full border border-para-200 p-2 text-slate-500 transition hover:border-red-300 hover:text-red-500"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path strokeLinecap="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}