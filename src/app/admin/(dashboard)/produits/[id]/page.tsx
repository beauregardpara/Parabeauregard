import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/format";
import { ProductImagesEditor } from "@/components/product-images-editor";
import { saveProductEdits, archiveProduct, duplicateProduct, updateProductStatus, updateProductImagesAction } from "@/lib/actions/admin";
import { PageHeader } from "@/components/admin-shell";
import { Check, Eye, Hourglass } from "lucide-react";
import { requireAdminPagePermission } from "@/lib/auth";

async function saveProductEditsForm(formData: FormData) {
  "use server";
  await saveProductEdits(formData);
}

export default async function AdminProductEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ photos?: string }>;
}) {
  await requireAdminPagePermission("products:read");
  const { id } = await params;
  // Nombre de photos non envoyées lors de la création (voir AdminProductForm).
  const failedPhotos = Math.max(0, parseInt((await searchParams).photos ?? "0") || 0);
  const productId = parseInt(id);
  if (!Number.isFinite(productId)) notFound();

  const [product, categories, priceHistory, stockHistory] = await Promise.all([
    db.product.findUnique({
      where: { id: productId },
      include: { images: { orderBy: { order: "asc" } }, category: true },
    }),
    db.category.findMany({ orderBy: [{ parentId: "asc" }, { order: "asc" }] }),
    db.priceHistory.findMany({ where: { productId }, orderBy: { changedAt: "desc" }, take: 10 }),
    db.stockHistory.findMany({ where: { productId }, orderBy: { changedAt: "desc" }, take: 10 }),
  ]);
  if (!product) notFound();

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-para-400";

  return (
    <>
      <PageHeader
        title={product.name}
        subtitle={`Source : ${product.sourceName ?? "manuel"} · Réf. ${product.sku ?? product.id}`}
        action={
          <div className="flex gap-2">
            <Link href={`/produits/${product.slug}`} target="_blank"
              className="btn-3d rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 hover:bg-mint">
              ↗ Voir sur le site
            </Link>
            {(["PENDING_REVIEW", "PUBLISHED", "HIDDEN"] as const).map((s) => (
              <form key={s} action={updateProductStatus}>
                <input type="hidden" name="id" value={product.id} />
                <input type="hidden" name="status" value={s} />
                <button className={`btn-3d rounded-xl px-4 py-2 text-xs font-bold transition ${
                  product.status === s ? "bg-para-700 text-white shadow" : "border border-slate-200 bg-white hover:bg-mint"
                }`}>
                  <span className="inline-flex items-center gap-1.5">
                    {s === "PENDING_REVIEW" ? <Hourglass size={14} aria-hidden /> : s === "PUBLISHED" ? <Check size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
                    {s === "PENDING_REVIEW" ? "À valider" : s === "PUBLISHED" ? "Publié" : "Masqué"}
                  </span>
                </button>
              </form>
            ))}
            <form action={duplicateProduct}>
              <input type="hidden" name="id" value={product.id} />
              <button className="btn-3d rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-mint">Dupliquer</button>
            </form>
          </div>
        }
      />

      <form action={saveProductEditsForm} className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <input type="hidden" name="id" value={product.id} />
        <input type="hidden" name="status" value={product.status} />

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-display font-bold">Informations générales</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Nom</span>
                <input name="name" defaultValue={product.name} required className={inputCls} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Slug</span>
                  <input name="slug" defaultValue={product.slug} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className={inputCls} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">SKU / référence</span>
                  <input name="sku" defaultValue={product.sku ?? ""} className={inputCls} />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Marque</span>
                <input name="brand" defaultValue={product.brand ?? ""} className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Description courte</span>
                <textarea name="shortDescription" defaultValue={product.shortDescription ?? ""} rows={2} className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Description complète</span>
                <textarea name="description" defaultValue={product.description ?? ""} rows={8} className={inputCls} />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-display font-bold">Images ({product.images.length})</h2>
            {failedPhotos > 0 && (
              <p role="alert" className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                Le produit est bien créé, mais {failedPhotos} photo{failedPhotos > 1 ? "s n’ont" : " n’a"} pas pu être envoyée{failedPhotos > 1 ? "s" : ""}.
                Ajoutez-la{failedPhotos > 1 ? "s" : ""} à nouveau ci-dessous.
              </p>
            )}
            <ProductImagesEditor
              productId={product.id}
              productName={product.name}
              images={product.images}
              actionFn={updateProductImagesAction}
            />
            {product.sourceUrl && (
              <a href={product.sourceUrl} target="_blank" rel="noreferrer"
                className="mt-3 inline-block text-xs text-slate-400 hover:text-para-600">
                ↗ Ouvrir la fiche source
              </a>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-display font-bold">Prix & stock</h2>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Prix (DH)</span>
                <input name="price" type="number" step="0.01" min="0" defaultValue={product.price} className={inputCls} />
              </label>
              <label>
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Prix promo</span>
                <input name="promoPrice" type="number" step="0.01" min="0" placeholder="—" defaultValue={product.promoPrice ?? ""} className={inputCls} />
              </label>
              <label>
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Stock</span>
                <input name="stock" type="number" min="0" defaultValue={product.stock} className={inputCls} />
              </label>
              <label>
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Seuil alerte</span>
                <input name="lowStockThreshold" type="number" min="0" defaultValue={product.lowStockThreshold} className={inputCls} />
              </label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" name="unlimitedStock" defaultChecked={product.unlimitedStock} className="h-4 w-4 accent-para-600" />
              Stock illimité (ne pas suivre)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isFeatured" defaultChecked={product.isFeatured} className="h-4 w-4 accent-para-600" />
              Mettre en avant (best-seller accueil)
            </label>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 font-display font-bold">Catégorie interne</h2>
            <select name="categoryId" defaultValue={product.categoryId ?? ""} className={inputCls}>
              <option value="">— Non classée —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parentId ? `— ${c.name}` : c.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-400">Réassociez les catégories issues du scraping vers le référentiel interne.</p>
          </section>

          <button type="submit" className="btn-shine btn-3d w-full rounded-xl bg-gradient-to-r from-para-500 to-para-700 py-3 font-bold text-white shadow-lift">
            💾 Enregistrer les modifications
          </button>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 font-display font-bold">Historique prix</h2>
            {priceHistory.length === 0 ? (
              <p className="text-xs text-slate-400">Aucun changement enregistré.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {priceHistory.map((h) => (
                  <li key={h.id} className="flex justify-between gap-2">
                    <span className="text-slate-400">{formatDate(h.changedAt)}</span>
                    <span>{formatPrice(h.oldPrice)} → <strong>{formatPrice(h.newPrice)}</strong></span>
                  </li>
                ))}
              </ul>
            )}
            <h2 className="mb-3 mt-5 font-display font-bold">Historique stock</h2>
            {stockHistory.length === 0 ? (
              <p className="text-xs text-slate-400">Aucun changement enregistré.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {stockHistory.map((h) => (
                  <li key={h.id} className="flex justify-between gap-2">
                    <span className="text-slate-400">{formatDate(h.changedAt)} · {h.reason}</span>
                    <span>{h.oldStock} → <strong>{h.newStock}</strong></span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {!product.sourceName || product.sourceName === "manuel" ? (
            <button formAction={archiveProduct}
              className="btn-3d w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100">
              Archiver ce produit
            </button>
          ) : (
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-center text-[11px] leading-relaxed text-slate-400">
              Produit issu du scraping : il sera resynchronisé à la prochaine exécution. Utilisez le statut « Masqué » pour le retirer de la vente.
            </p>
          )}
        </aside>
      </form>
    </>
  );
}
