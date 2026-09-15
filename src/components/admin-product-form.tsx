"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createProduct, saveProductEdits } from "@/lib/actions/admin";

type Category = { id: number; name: string; parentId: number | null };
type ProductValue = {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  brand: string | null;
  categoryId: number | null;
  shortDescription: string | null;
  description: string | null;
  price: number;
  promoPrice: number | null;
  stock: number;
  lowStockThreshold: number;
  unlimitedStock: boolean;
  isFeatured: boolean;
  status: "PENDING_REVIEW" | "PUBLISHED" | "HIDDEN";
};

export function AdminProductForm({ categories, product }: { categories: Category[]; product?: ProductValue }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    const form = event.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const result = product ? await saveProductEdits(data) : await createProduct(data);
      if (!result.ok) {
        setError(result.error ?? "Impossible d’enregistrer le produit.");
        return;
      }
      if (!product && result.id) {
        router.push(`/admin/produits/${result.id}`);
        router.refresh();
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_360px]">
      {product && <input type="hidden" name="id" value={product.id} />}
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-display font-bold">Informations générales</h2>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Nom *</span>
              <input name="name" value={name} onChange={(event) => { setName(event.target.value); if (!product && !slug) setSlug(event.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")); }} required className="admin-input" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Slug *</span>
                <input name="slug" value={slug} onChange={(event) => setSlug(event.target.value)} required className="admin-input" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">SKU / référence</span>
                <input name="sku" defaultValue={product?.sku ?? ""} className="admin-input" />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Marque {product ? "" : "*"}</span>
                <input name="brand" defaultValue={product?.brand ?? ""} required={!product} className="admin-input" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Catégorie {product ? "" : "*"}</span>
                <select name="categoryId" defaultValue={product?.categoryId ?? ""} required={!product} className="admin-input">
                  <option value="">— Choisir —</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.parentId ? `— ${category.name}` : category.name}</option>)}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Description courte</span>
              <textarea name="shortDescription" defaultValue={product?.shortDescription ?? ""} rows={2} className="admin-input" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Description complète</span>
              <textarea name="description" defaultValue={product?.description ?? ""} rows={9} className="admin-input" />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 font-display font-bold">Publication</h2>
          <p className="mb-4 text-xs text-slate-500">Enregistrez en brouillon pour préparer la fiche avant de la rendre visible.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Statut</span>
              <select name="status" defaultValue={product?.status ?? "PENDING_REVIEW"} className="admin-input">
                <option value="PENDING_REVIEW">Brouillon / à valider</option>
                <option value="PUBLISHED">Publié</option>
                <option value="HIDDEN">Masqué / archivé</option>
              </select>
            </label>
          </div>
        </section>
      </div>

      <aside className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-display font-bold">Prix & stock</h2>
          <div className="grid grid-cols-2 gap-3">
            <label><span className="admin-label">Prix (DH) *</span><input name="price" type="number" step="0.01" min="0" required defaultValue={product?.price ?? ""} className="admin-input" /></label>
            <label><span className="admin-label">Prix promo</span><input name="promoPrice" type="number" step="0.01" min="0" defaultValue={product?.promoPrice ?? ""} className="admin-input" /></label>
            <label><span className="admin-label">Stock *</span><input name="stock" type="number" min="0" required defaultValue={product?.stock ?? 0} className="admin-input" /></label>
            <label><span className="admin-label">Seuil alerte</span><input name="lowStockThreshold" type="number" min="0" defaultValue={product?.lowStockThreshold ?? 3} className="admin-input" /></label>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" name="unlimitedStock" defaultChecked={product?.unlimitedStock} className="h-4 w-4 accent-para-600" /> Stock illimité</label>
          <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="isFeatured" defaultChecked={product?.isFeatured} className="h-4 w-4 accent-para-600" /> Mettre en avant</label>
        </section>

        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
          {product ? "Les images se gèrent dans la section Images ci-dessous, après l’enregistrement." : "Enregistrez d’abord le produit : l’upload sécurisé des images sera disponible sur sa fiche."}
        </div>

        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        {success && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">Modifications enregistrées.</p>}
        <button type="submit" disabled={pending} className="w-full rounded-xl bg-para-800 py-3 font-bold text-white shadow-lift transition hover:bg-para-900 disabled:opacity-50">
          {pending ? "Enregistrement…" : product ? "Enregistrer les modifications" : "Enregistrer le produit"}
        </button>
        <button type="button" onClick={() => router.push("/admin/produits")} className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600">Annuler</button>
      </aside>
    </form>
  );
}
