"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProductImage from "@/components/product-image";
import { useCompare } from "@/lib/compare-context";
import { formatPrice } from "@/lib/format";

type CompareProduct = {
  id: number;
  name: string;
  slug: string;
  brand: string | null;
  price: number;
  promoPrice: number | null;
  imageUrl: string | null;
  stock: number;
  unlimitedStock: boolean;
  categoryName: string | null;
  sku: string | null;
  description: string | null;
  avgRating: number | null;
  reviewsCount: number;
};

type ComparableProduct = {
  slug: string;
  name: string;
  brand: string | null;
  price: number;
  promoPrice: number | null;
  effectivePrice: number;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  rating: number | null;
  reviewsCount: number;
};

type CompareFeature = { slug: string; name: string; chips: string[] };
type ComparisonSummary = { slug: string; summary: string };
type ComparisonResult = { ai: boolean; verdict: string; summaries: ComparisonSummary[] };
type CompareData = { products: ComparableProduct[]; features: CompareFeature[]; ai: ComparisonResult };
type CompareResponse = { ok: boolean; data?: CompareData; error?: string };

export default function ComparePage() {
  const { items, count, remove, clear } = useCompare();
  const [products, setProducts] = useState<CompareProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiData, setAiData] = useState<CompareData | null>(null);
  const [comparing, setComparing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState("");

  const ids = items.map((i) => i.id).join(",");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    if (items.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    fetch(`/api/compare?ids=${ids}`)
      .then((r) => r.json())
      .then((data: CompareProduct[]) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ids, items.length]);

  useEffect(() => {
    setAiData(null);
    setAiError(null);
  }, [ids]);

  async function runAiCompare() {
    if (products.length < 2 || comparing) return;
    setComparing(true);
    setAiError(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slugs: products.map((p) => p.slug),
          note: aiNote.trim() || undefined,
        }),
      });
      const data = (await res.json()) as CompareResponse;
      if (!res.ok || !data.ok || !data.data) {
        setAiError(data.error ?? "Impossible de lancer la comparaison.");
        setAiData(null);
      } else {
        setAiData(data.data);
      }
    } catch {
      setAiError("Impossible de contacter le serveur.");
    } finally {
      setComparing(false);
    }
  }

  const rows: { label: string; render: (p: CompareProduct) => React.ReactNode }[] = [
    { label: "Marque", render: (p) => p.brand ?? "—" },
    { label: "Catégorie", render: (p) => p.categoryName ?? "—" },
    { label: "Prix", render: (p) => formatPrice(p.promoPrice ?? p.price) },
    { label: "Prix barré", render: (p) => (p.promoPrice ? formatPrice(p.price) : "—") },
    { label: "Note moyenne", render: (p) => (p.avgRating ? `${p.avgRating.toFixed(1)}/5 (${p.reviewsCount})` : "—") },
    { label: "Disponibilité", render: (p) => (p.unlimitedStock || p.stock > 0 ? "En stock ✓" : "Indisponible") },
    { label: "Référence", render: (p) => p.sku ?? "—" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-para-950">Comparateur produits</h1>
          <p className="mt-1 text-sm text-slate-500">
            Comparez jusqu'à 4 produits côte à côte. La balance sur chaque fiche permet d'ajouter un produit.
          </p>
        </div>
        {count > 0 && (
          <button onClick={clear} className="btn-3d rounded-full border border-para-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-mint">
            Vider ({count})
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-para-200 bg-mint/40 py-20 text-center">
          <span className="text-5xl" aria-hidden>⚖️</span>
          <p className="mt-4 text-slate-600">Aucun produit à comparer pour le moment.</p>
          <p className="mt-1 text-sm text-slate-500">Cliquez sur l'icône balance d'une fiche produit pour commencer.</p>
          <Link href="/" className="btn-shine btn-3d mt-6 inline-block rounded-full bg-gradient-to-r from-para-500 to-para-700 px-7 py-3 font-semibold text-white">
            Découvrir la boutique
          </Link>
        </div>
      ) : loading ? (
        <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${Math.min(4, count)}, minmax(0,1fr))` }}>
          {items.map((i) => (
            <div key={i.id} className="skeleton h-64 rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-para-100 bg-white shadow-sm">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-para-100">
                <th className="w-40 p-4 text-left align-bottom text-xs font-bold uppercase tracking-wide text-slate-500">
                  {items.length} produit(s)
                </th>
                {products.map((p) => (
                  <th key={p.id} className="min-w-[180px] p-4 align-top">
                    <div className="flex flex-col gap-3">
                      <div className="relative mx-auto h-32 w-32 overflow-hidden rounded-2xl border border-para-100 bg-mint">
                        <ProductImage src={p.imageUrl} alt={p.name} fill fallbackSeed={p.name} sizes="128px" className="object-cover" />
                      </div>
                      <Link href={`/produits/${p.slug}`} className="line-clamp-2 font-semibold text-para-900 hover:text-para-700">
                        {p.name}
                      </Link>
                      <button onClick={() => remove(p.id)} className="mx-auto text-[11px] font-semibold text-slate-500 hover:text-coral-600">
                        ✕ Retirer
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-para-50">
                  <th className="bg-mint/30 p-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{row.label}</th>
                  {products.map((p) => (
                    <td key={p.id} className="p-4 text-center text-slate-700">
                      {row.render(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {products.length >= 2 && (
        <div className="mt-8 flex flex-wrap items-end gap-3 rounded-3xl border border-para-100 bg-white p-4 shadow-sm">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="ai-note" className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Précision pour l'analyse (optionnel)
            </label>
            <input
              id="ai-note"
              value={aiNote}
              onChange={(e) => setAiNote(e.target.value)}
              placeholder="Ex. : je compare pour une peau sèche, budget 200 DH"
              className="w-full rounded-full border border-para-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-para-500 focus:bg-white"
            />
          </div>
          <button
            onClick={runAiCompare}
            disabled={comparing || products.length < 2}
            className="btn-shine btn-3d rounded-full bg-gradient-to-r from-para-500 to-para-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {comparing ? "Analyse en cours…" : "Comparer (IA)"}
          </button>
          {aiError && <p className="w-full text-sm text-coral-600">{aiError}</p>}
        </div>
      )}

      {aiData && (
        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="font-display text-xl font-extrabold text-para-950">Comparaison détaillée</h2>
            {aiData.ai.ai ? (
              <span className="rounded-full bg-para-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-para-800">
                Analyse IA
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                Analyse automatique
              </span>
            )}
          </div>

          <div className="overflow-x-auto rounded-3xl border border-para-100 bg-white shadow-sm">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-para-100">
                  <th className="w-40 p-4 text-left align-bottom text-xs font-bold uppercase tracking-wide text-slate-500">
                    {aiData.products.length} produit(s)
                  </th>
                  {aiData.products.map((p) => (
                    <th key={p.slug} className="min-w-[180px] p-4 align-top">
                      <Link href={`/produits/${p.slug}`} className="line-clamp-2 font-semibold text-para-900 hover:text-para-700">
                        {p.name}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    { label: "Prix", render: (p: ComparableProduct) => formatPrice(p.promoPrice ?? p.price) },
                    { label: "Prix barré", render: (p: ComparableProduct) => (p.promoPrice ? formatPrice(p.price) : "—") },
                    { label: "Prix effectif", render: (p: ComparableProduct) => formatPrice(p.effectivePrice) },
                    { label: "Catégorie", render: (p: ComparableProduct) => p.category ?? "—" },
                    {
                      label: "Atouts (texte produit)",
                      render: (p: ComparableProduct) => {
                        const feature = aiData.features.find((f) => f.slug === p.slug);
                        const chips = feature?.chips ?? [];
                        return chips.length > 0 ? chips.join(", ") : "—";
                      },
                    },
                  ] as { label: string; render: (p: ComparableProduct) => string }[]
                ).map((row) => (
                  <tr key={row.label} className="border-b border-para-50">
                    <th className="bg-mint/30 p-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{row.label}</th>
                    {aiData.products.map((p) => (
                      <td key={p.slug} className="p-4 text-center text-slate-700">
                        {row.render(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-3xl border border-para-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Verdict</p>
            <p className="mt-1.5 leading-relaxed text-slate-700">{aiData.ai.verdict}</p>
            <ul className="mt-4 space-y-3">
              {aiData.ai.summaries.map((s) => {
                const product = aiData.products.find((p) => p.slug === s.slug);
                return (
                  <li key={s.slug} className="rounded-2xl bg-mint/40 p-4">
                    <p className="font-semibold text-para-900">{product?.name ?? s.slug}</p>
                    <p className="mt-1 text-sm text-slate-600">{s.summary}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
