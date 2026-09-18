"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createProduct, saveProductEdits, uploadProductImageAction } from "@/lib/actions/admin";
import { ACCEPTED_IMAGE_TYPES, compressProductImage, MAX_UPLOAD_BYTES } from "@/lib/image-compress";

const MAX_PHOTOS = 12;
type PendingPhoto = { key: string; file: File; preview: string };

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
  // Photos choisies à la création : envoyées juste après l'enregistrement du
  // produit, car l'upload a besoin de son identifiant.
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.preview)), []);

  function addPhotos(files: File[]) {
    setError(null);
    const images = files.filter((file) => ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number]));
    if (images.length < files.length) setError("Seules les images JPEG, PNG ou WEBP sont acceptées.");
    setPhotos((prev) => [
      ...prev,
      ...images.slice(0, Math.max(0, MAX_PHOTOS - prev.length)).map((file) => ({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
      })),
    ]);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  function movePhoto(index: number, direction: -1 | 1) {
    setPhotos((prev) => {
      const next = index + direction;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  }

  /** Envoie les photos dans l'ordre choisi ; renvoie le nombre d'échecs. */
  async function uploadPhotos(productId: number): Promise<number> {
    let failed = 0;
    for (const [index, photo] of photos.entries()) {
      setProgress(`Envoi des photos ${index + 1}/${photos.length}…`);
      const file = await compressProductImage(photo.file);
      if (file.size > MAX_UPLOAD_BYTES) {
        failed += 1;
        continue;
      }
      const data = new FormData();
      data.set("productId", String(productId));
      data.set("file", file);
      const result = await uploadProductImageAction(data).catch(() => ({ ok: false }));
      if (!result.ok) failed += 1;
    }
    setProgress(null);
    return failed;
  }

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
        // Le produit existe désormais : un échec de photo ne doit pas le faire
        // recréer, on le signale sur sa fiche où l'on peut réessayer.
        const failed = photos.length ? await uploadPhotos(result.id) : 0;
        // Navigation complète plutôt que `router.push` : chaque upload appelle
        // `revalidatePath`, et un `router.push` lancé ensuite dans la même
        // transition peut rester bloqué indéfiniment (bouton figé sur
        // « Enregistrement… »). Le bouton reste verrouillé jusqu'au départ de la
        // page pour empêcher toute double création.
        setRedirecting(true);
        window.location.assign(`/admin/produits/${result.id}${failed ? `?photos=${failed}` : ""}`);
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

        {!product && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 font-display font-bold">Photos du produit</h2>
            <p className="mb-4 text-xs text-slate-500">
              La première photo est la photo principale. Elles sont envoyées à l&apos;enregistrement du produit.
            </p>
            {photos.length > 0 && (
              <ul className="mb-4 flex flex-wrap gap-3" aria-label="Photos sélectionnées">
                {photos.map((photo, index) => (
                  <li key={photo.key} className="relative h-28 w-24 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) avant upload */}
                    <img src={photo.preview} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removePhoto(index)} aria-label={`Retirer la photo ${index + 1}`}
                      className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-white/90 text-[11px] font-bold text-red-500 shadow hover:bg-red-500 hover:text-white">✕</button>
                    <span className="absolute bottom-1 left-1 rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">{index === 0 ? "Principale" : `#${index + 1}`}</span>
                    <div className="absolute bottom-1 right-1 flex gap-0.5">
                      <button type="button" onClick={() => movePhoto(index, -1)} disabled={index === 0} aria-label={`Déplacer la photo ${index + 1} vers la gauche`} className="grid h-5 w-5 place-items-center rounded bg-white/90 text-[10px] disabled:opacity-30">←</button>
                      <button type="button" onClick={() => movePhoto(index, 1)} disabled={index === photos.length - 1} aria-label={`Déplacer la photo ${index + 1} vers la droite`} className="grid h-5 w-5 place-items-center rounded bg-white/90 text-[10px] disabled:opacity-30">→</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {photos.length < MAX_PHOTOS ? (
              <label
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-para-200 bg-para-50/40 px-4 py-6 text-center text-sm text-para-700 transition hover:bg-para-50"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => { event.preventDefault(); addPhotos(Array.from(event.dataTransfer.files)); }}
              >
                <span className="font-bold">Ajouter des photos</span>
                <span className="mt-1 text-xs text-slate-500">Glissez-les ici ou cliquez pour choisir · JPEG, PNG ou WEBP · {photos.length}/{MAX_PHOTOS}</span>
                <span className="mt-1 text-[11px] text-slate-400">Les photos lourdes sont réduites automatiquement.</span>
                {/* Sans attribut `name` : les fichiers ne partent pas avec les champs du produit. */}
                <input type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} multiple className="sr-only"
                  aria-label="Choisir des photos du produit"
                  onChange={(event) => { addPhotos(Array.from(event.target.files ?? [])); event.currentTarget.value = ""; }} />
              </label>
            ) : (
              <p className="text-xs text-slate-500">Maximum de {MAX_PHOTOS} photos atteint.</p>
            )}
          </section>
        )}

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

        {product && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
            Les images se gèrent dans la section Images ci-dessous.
          </div>
        )}

        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        {success && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">Modifications enregistrées.</p>}
        <button type="submit" disabled={pending || redirecting} className="w-full rounded-xl bg-para-800 py-3 font-bold text-white shadow-lift transition hover:bg-para-900 disabled:opacity-50">
          {redirecting ? "Ouverture de la fiche…" : progress ?? (pending ? "Enregistrement…" : product ? "Enregistrer les modifications" : "Enregistrer le produit")}
        </button>
        <button type="button" onClick={() => router.push("/admin/produits")} className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600">Annuler</button>
      </aside>
    </form>
  );
}
