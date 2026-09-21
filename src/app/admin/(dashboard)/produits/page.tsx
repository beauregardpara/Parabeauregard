import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/format";
import ProductImage from "@/components/product-image";
import { StatusPill } from "@/components/status-pill";
import { bulkProductAction } from "@/lib/actions/admin";
import { PageHeader } from "@/components/admin-shell";
import { Clock3, Database, Eye, Plus, Search, Trash2, Upload } from "lucide-react";
import { requireAdminPagePermission } from "@/lib/auth";
import { foldForSearch } from "@/lib/product-name";
import { getSettingNumber, SETTING_KEYS } from "@/lib/settings";
import { AdminProductImport } from "@/components/admin-product-import";
import { BulkDeleteProductButton, SelectAllPageCheckbox } from "@/components/admin-product-selection";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; source?: string; q?: string; page?: string; marque?: string; categorie?: string; stock?: string; promo?: string; tri?: string }>;
}) {
  await requireAdminPagePermission("products:read");
  const sp = await searchParams;
  const lowStockThreshold = (await getSettingNumber(SETTING_KEYS.lowStockAlerts)) || 3;
  const where: Record<string, unknown> = {};
  if (sp.statut === "RUPTURE") {
    where.status = "PUBLISHED";
    where.stock = 0;
    where.unlimitedStock = false;
  } else if (sp.statut) where.status = sp.statut;
  if (sp.source) where.sourceName = sp.source;
  if (sp.q) {
    // PostgreSQL compare les LIKE en respectant la casse et les accents : on
    // cherche aussi dans le texte replié (« avene » trouve « Avène »).
    const q = sp.q.trim();
    const folded = foldForSearch(q);
    const id = /^\d+$/.test(q) ? Number(q) : null;
    where.OR = [
      ...(folded ? [{ searchText: { contains: folded } }, { slug: { contains: folded.replace(/\s+/g, "-") } }] : []),
      { name: { contains: q } },
      { sku: { contains: q } },
      { brand: { contains: q } },
      ...(id ? [{ id }] : []),
    ];
  }
  if (sp.marque) where.brand = sp.marque;
  if (sp.categorie) where.categoryId = Number(sp.categorie);
  if (sp.stock === "faible") { where.stock = { lte: lowStockThreshold, gt: 0 }; where.unlimitedStock = false; }
  if (sp.stock === "rupture") { where.stock = 0; where.unlimitedStock = false; }
  if (sp.promo === "oui") where.promoPrice = { not: null };

  const perPage = 25;
  const page = Math.max(1, parseInt(sp.page ?? "1"));

  const orderBy = sp.tri === "nom" ? { name: "asc" as const } : sp.tri === "prix" ? { price: "asc" as const } : sp.tri === "stock" ? { stock: "asc" as const } : sp.tri === "ancien" ? { createdAt: "asc" as const } : { updatedAt: "desc" as const };
  const [products, total, sources, brands, categories] = await Promise.all([
    db.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      include: { category: true, images: { take: 1, orderBy: { order: "asc" } } },
    }),
    db.product.count({ where }),
    db.product.groupBy({ by: ["sourceName"] }),
    db.product.findMany({ where: { brand: { not: null } }, distinct: ["brand"], select: { brand: true }, orderBy: { brand: "asc" } }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
  ]);

  const pages = Math.ceil(total / perPage);
  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    Object.entries({ ...sp, ...extra }).forEach(([k, v]) => v && p.set(k, v));
    return `/admin/produits?${p.toString()}`;
  };

  const tabs = [
    ["", "Tous"],
    ["PENDING_REVIEW", "À valider"],
    ["PUBLISHED", "Publiés"],
    ["HIDDEN", "Masqués"],
    ["RUPTURE", "En rupture"],
  ] as const;

  return (
    <>
      <PageHeader
        title="Produits"
        subtitle={`${total} produit(s) — validez les imports du scraper avant publication.`}
        action={
          <div className="flex flex-wrap justify-end gap-2">
          <Link href="/admin/produits/nouveau" className="btn-3d inline-flex items-center gap-1.5 rounded-xl bg-para-800 px-4 py-2 text-sm font-bold text-white hover:bg-para-900"><Plus size={15} aria-hidden /> Ajouter un produit</Link>
          <AdminProductImport categories={categories.map(({ id, name, slug }) => ({ id, name, slug }))} />
          <form action="/admin/produits" className="flex gap-2">
            <input name="q" placeholder="Rechercher un produit…" defaultValue={sp.q}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-para-400" />
            <button aria-label="Rechercher" className="btn-3d rounded-xl bg-para-800 px-4 py-2 text-sm font-semibold text-white"><Search size={15} aria-hidden /></button>
          </form>
          </div>
        }
      />

      <form action="/admin/produits" className="mb-5 grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <select name="marque" defaultValue={sp.marque ?? ""} className="admin-input"><option value="">Toutes les marques</option>{brands.map((brand) => <option key={brand.brand} value={brand.brand!}>{brand.brand}</option>)}</select>
        <select name="categorie" defaultValue={sp.categorie ?? ""} className="admin-input"><option value="">Toutes les catégories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
        <select name="stock" defaultValue={sp.stock ?? ""} className="admin-input"><option value="">Tous les stocks</option><option value="faible">Stock faible</option><option value="rupture">En rupture</option></select>
        <select name="promo" defaultValue={sp.promo ?? ""} className="admin-input"><option value="">Promotion : toutes</option><option value="oui">En promotion</option></select>
        <select name="tri" defaultValue={sp.tri ?? ""} className="admin-input"><option value="">Dernières mises à jour</option><option value="nom">Nom</option><option value="prix">Prix croissant</option><option value="stock">Stock croissant</option><option value="ancien">Plus anciens</option></select>
        <input type="hidden" name="q" value={sp.q ?? ""} /><input type="hidden" name="statut" value={sp.statut ?? ""} />
        <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white sm:col-span-2 lg:col-span-5 lg:justify-self-end">Appliquer les filtres</button>
      </form>

      {/* Onglets statuts */}
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map(([val, label]) => (
          <Link key={val} href={qs({ statut: val || undefined, page: undefined })}
            className={`btn-3d rounded-full px-4 py-1.5 text-xs font-bold transition ${
              (sp.statut ?? "") === val ? "bg-gradient-to-r from-para-600 to-para-700 text-white shadow" : "border border-slate-200 bg-white text-slate-500 hover:bg-mint"
            }`}>
            {label}
          </Link>
        ))}
        {sources.filter((s) => s.sourceName).map((s) => (
          <Link key={s.sourceName} href={qs({ source: s.sourceName!, page: undefined })}
            className={`btn-3d rounded-full px-4 py-1.5 text-xs font-bold transition ${
              sp.source === s.sourceName ? "bg-para-900 text-white shadow" : "border border-slate-200 bg-white text-slate-400 hover:bg-mint"
            }`}>
            <Database className="mr-1 inline-block" size={13} aria-hidden /> {s.sourceName}
          </Link>
        ))}
      </div>

      {/* Actions en masse + tableau dans le même formulaire */}
      {products.length > 0 ? (
        <form action={bulkProductAction}>
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-mint/60 p-3 text-sm">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Sélection →</span>
            <SelectAllPageCheckbox count={products.length} />
            {[
              { action: "publish", label: "Publier", Icon: Upload },
              { action: "hide", label: "Masquer", Icon: Eye },
              { action: "pending", label: "À valider", Icon: Clock3 },
              { action: "archive", label: "Archiver", Icon: Trash2 },
            ].map(({ action, label, Icon }) => (
              <button key={action} type="submit" name="bulkAction" value={action}
                className="btn-3d rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-white/70">
                <span className="inline-flex items-center gap-1.5"><Icon size={13} aria-hidden />{label}</span>
              </button>
            ))}
            <BulkDeleteProductButton />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3"></th>
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3">Catégorie</th>
                  <th className="px-4 py-3">Prix</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">MàJ</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {products.map((p) => (
                  <tr key={p.id} className="transition hover:bg-mint/30">
                    <td className="px-4"><input type="checkbox" name="ids" value={p.id} className="h-4 w-4 accent-para-600" aria-label={`Sélectionner ${p.name}`} /></td>
                <td className="max-w-[280px] px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-mint">
                      <ProductImage src={p.images[0]?.url ?? null} alt="" fill fallbackSeed={p.name} sizes="40px" className="object-cover" />
                    </span>
                    <span className="min-w-0">
                      <Link href={`/admin/produits/${p.id}`} className="block truncate font-semibold hover:text-para-700">{p.name}</Link>
                      <span className="text-xs text-slate-400">{p.brand ?? "—"} · {p.sourceName ?? "manuel"}</span>
                    </span>
                  </div>
                </td>
                <td className="px-4 text-slate-500">{p.category?.name ?? "—"}</td>
                <td className="px-4 whitespace-nowrap">
                  <strong>{formatPrice(p.promoPrice ?? p.price)}</strong>
                  {p.promoPrice != null && <span className="ml-1 text-xs text-slate-300 line-through">{formatPrice(p.price)}</span>}
                </td>
                <td className="px-4">
                  {p.unlimitedStock ? (
                    <span className="font-semibold text-para-600">∞</span>
                  ) : (
                    <span className={p.stock === 0 ? "font-bold text-red-500" : p.stock <= p.lowStockThreshold ? "font-bold text-amber-600" : ""}>{p.stock}</span>
                  )}
                </td>
                <td className="px-4"><StatusPill status={p.status} /></td>
                <td className="whitespace-nowrap px-4 text-xs text-slate-400">{formatDate(p.updatedAt)}</td>
                <td className="px-4 text-right">
                  <Link href={`/admin/produits/${p.id}`} className="btn-3d inline-block rounded-lg bg-para-50 px-3 py-1.5 text-xs font-bold text-para-700 hover:bg-para-100">
                    Éditer
                  </Link>
                </td>
              </tr>
                ))}
              </tbody>
            </table>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-14 text-center text-slate-400">
          Aucun produit ne correspond à ces filtres.
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-6 flex justify-center gap-2" aria-label="Pagination">
          {Array.from({ length: Math.min(pages, 15) }, (_, i) => i + 1).map((n) => (
            <a key={n} href={qs({ page: String(n) })}
              className={`grid h-9 w-9 place-items-center rounded-lg text-xs font-bold ${n === page ? "bg-para-700 text-white" : "border border-slate-200 bg-white hover:bg-mint"}`}>
              {n}
            </a>
          ))}
        </nav>
      )}
    </>
  );
}
