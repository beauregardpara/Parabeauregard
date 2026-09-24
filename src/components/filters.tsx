"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useEscapeClose } from "@/lib/use-escape-close";

export function Filters({
  brands,
  basePath,
}: {
  brands: string[];
  basePath: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  useEscapeClose(open, () => setOpen(false));

  const selectedBrands = params.getAll("marque");
  const minPrice = params.get("min") ?? "";
  const maxPrice = params.get("max") ?? "";
  const inStock = params.get("dispo") === "1";
  const onSale = params.get("promo") === "1";
  const sort = params.get("tri") ?? "";

  const update = (mutate: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(params.toString());
    mutate(p);
    router.push(`${basePath}?${p.toString()}`, { scroll: false });
  };

  const toggleBrand = (brand: string) => {
    update((p) => {
      const cur = p.getAll("marque");
      p.delete("marque");
      const next = cur.includes(brand) ? cur.filter((b) => b !== brand) : [...cur, brand];
      next.forEach((b) => p.append("marque", b));
    });
  };

  return (
    <>
      {/* Desktop : sidebar sticky */}
      <div className="hidden rounded-3xl border border-para-100 bg-white shadow-[var(--shadow-card)] lg:block">
        <p className="px-5 py-4 font-display font-bold text-para-900">Filtres</p>
        <FilterBody
          brands={brands}
          basePath={basePath}
          sort={sort}
          minPrice={minPrice}
          maxPrice={maxPrice}
          selectedBrands={selectedBrands}
          inStock={inStock}
          onSale={onSale}
          update={update}
          toggleBrand={toggleBrand}
        />
      </div>

      {/* Mobile : bouton + drawer coulissant */}
      <div className="lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="btn-3d flex w-full items-center justify-center gap-2 rounded-full border border-para-200 bg-white px-4 py-2.5 text-sm font-bold text-para-800 shadow-sm"
          aria-expanded={open}
          aria-controls="filter-drawer"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          Filtres
        </button>

        <div
          onClick={() => setOpen(false)}
          inert={!open}
          className={`fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300 ${
            open ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden
        />
        {/* Conteneur clippé : voir header.tsx — évite le débordement horizontal. */}
        <div
          aria-hidden={!open}
          className="pointer-events-none fixed inset-y-0 right-0 z-50 w-full max-w-sm overflow-hidden"
        >
        <aside
          id="filter-drawer"
          inert={!open}
          aria-modal="true"
          className={`pointer-events-auto flex h-full w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
          role="dialog"
          aria-label="Filtres"
        >
          <div className="flex items-center justify-between border-b border-para-100 px-5 py-4">
            <h2 className="font-display text-lg font-bold text-para-900">Filtres</h2>
            <button onClick={() => setOpen(false)} className="btn-3d rounded-full p-2 hover:bg-para-50" aria-label="Fermer les filtres">
              ✕
            </button>
          </div>
          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
            <FilterBody
              brands={brands}
              basePath={basePath}
              sort={sort}
              minPrice={minPrice}
              maxPrice={maxPrice}
              selectedBrands={selectedBrands}
              inStock={inStock}
              onSale={onSale}
              update={update}
              toggleBrand={toggleBrand}
            />
          </div>
          <div className="border-t border-para-100 p-4">
            <button
              onClick={() => setOpen(false)}
              className="w-full rounded-full bg-gradient-to-r from-para-500 to-para-700 py-3 text-sm font-bold text-white"
            >
              Voir les résultats
            </button>
          </div>
        </aside>
        </div>
      </div>
    </>
  );
}

function FilterBody({
  brands,
  basePath,
  sort,
  minPrice,
  maxPrice,
  selectedBrands,
  inStock,
  onSale,
  update,
  toggleBrand,
}: {
  brands: string[];
  basePath: string;
  sort: string;
  minPrice: string;
  maxPrice: string;
  selectedBrands: string[];
  inStock: boolean;
  onSale: boolean;
  update: (mutate: (p: URLSearchParams) => void) => void;
  toggleBrand: (brand: string) => void;
}) {
  return (
    <div className="space-y-6 px-5 py-4">
      <div>
        <label htmlFor="filter-sort" className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Trier par</label>
        <select
          id="filter-sort"
          value={sort}
          onChange={(e) => update((p) => (e.target.value ? p.set("tri", e.target.value) : p.delete("tri")))}
          className="w-full rounded-xl border border-para-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-para-400 focus:ring-2 focus:ring-para-100"
        >
          <option value="">Pertinence</option>
          <option value="price-asc">Prix croissant</option>
          <option value="price-desc">Prix décroissant</option>
          <option value="popular">Popularité</option>
          <option value="name">Nom A→Z</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Prix (DH)</label>
        <div className="flex items-center gap-2">
          <input type="number" min={0} placeholder="min" aria-label="Prix minimum" defaultValue={minPrice} key={`min-${minPrice}`}
            onBlur={(e) => update((p) => (e.target.value ? p.set("min", e.target.value) : p.delete("min")))}
            className="w-full rounded-xl border border-para-200 px-3 py-2 text-sm outline-none transition focus:border-para-400 focus:ring-2 focus:ring-para-100" />
          <span className="text-slate-300">—</span>
          <input type="number" min={0} placeholder="max" aria-label="Prix maximum" defaultValue={maxPrice} key={`max-${maxPrice}`}
            onBlur={(e) => update((p) => (e.target.value ? p.set("max", e.target.value) : p.delete("max")))}
            className="w-full rounded-xl border border-para-200 px-3 py-2 text-sm outline-none transition focus:border-para-400 focus:ring-2 focus:ring-para-100" />
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Marques</legend>
        <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
          {brands.map((b) => (
            <label key={b} className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-sm transition hover:bg-mint">
              <input type="checkbox" checked={selectedBrands.includes(b)} onChange={() => toggleBrand(b)}
                className="h-4 w-4 rounded accent-para-600" />
              {b}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={inStock} onChange={(e) => update((p) => (e.target.checked ? p.set("dispo", "1") : p.delete("dispo")))}
            className="h-4 w-4 rounded accent-para-600" />
          En stock uniquement
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={onSale} onChange={(e) => update((p) => (e.target.checked ? p.set("promo", "1") : p.delete("promo")))}
            className="h-4 w-4 rounded accent-coral-500" />
          En promotion
        </label>
      </div>

      <a href={basePath} className="block rounded-xl border border-para-200 py-2 text-center text-xs font-bold text-para-700 transition hover:bg-mint">
        Réinitialiser les filtres
      </a>
    </div>
  );
}
