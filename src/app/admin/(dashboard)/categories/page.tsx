import { db } from "@/lib/db";
import { saveCategory, deleteCategory } from "@/lib/actions/admin";
import { PageHeader } from "@/components/admin-shell";
import { FolderTree, Save, Trash2 } from "lucide-react";
import { requireAdminPagePermission } from "@/lib/auth";

export default async function AdminCategoriesPage() {
  await requireAdminPagePermission("categories:read");
  const [parents, all] = await Promise.all([
    db.category.findMany({ where: { parentId: null }, orderBy: { order: "asc" }, include: { children: true, _count: { select: { products: true } } } }),
    db.category.findMany({ select: { id: true, name: true } }),
  ]);

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-para-400";

  return (
    <>
      <PageHeader title="Catégories" subtitle="Référentiel interne du site — les produits scrapés y sont réassociés." />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {parents.map((p) => (
            <div key={p.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-para-50 text-para-700" aria-hidden><FolderTree size={17} strokeWidth={1.7} /></span>
                  <span className="min-w-0 flex-1">
                    <strong>{p.name}</strong>
                    <span className="ml-2 text-xs text-slate-400">/{p.slug} · {p._count.products} produits</span>
                  </span>
                  <span className="text-xs text-slate-400 group-open:hidden">{p.children.length} sous-cat(s) ▾</span>
                </summary>
                <div className="border-t border-slate-50 px-5 py-4">
                  <form action={saveCategory} className="mb-3 grid grid-cols-[1fr_80px_auto_auto] gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="parentId" value={p.parentId ?? ""} />
                    <input name="name" defaultValue={p.name} className={inputCls} aria-label="Nom catégorie" />
                    <input name="order" type="number" defaultValue={p.order} className={inputCls} aria-label="Ordre" />
                    <button className="btn-3d rounded-lg bg-para-700 px-4 py-2 text-xs font-bold text-white" aria-label={`Enregistrer ${p.name}`}><Save size={14} aria-hidden /></button>
                  </form>
                  <ul className="space-y-2">
                    {p.children.map((ch) => (
                      <li key={ch.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <form action={saveCategory} className="flex flex-1 items-center gap-2">
                          <input type="hidden" name="id" value={ch.id} />
                          <input type="hidden" name="parentId" value={p.id} />
                          <input name="name" defaultValue={ch.name} className="flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 hover:border-slate-200 focus:bg-white focus:outline-none" aria-label={`Nom ${ch.name}`} />
                          <input name="order" type="number" defaultValue={ch.order} className="w-14 rounded-md border border-transparent bg-transparent px-1 py-0.5 hover:border-slate-200 focus:bg-white focus:outline-none" aria-label="Ordre" />
                          <button className="btn-3d text-xs font-bold text-para-600" aria-label={`Enregistrer ${ch.name}`}><Save size={14} aria-hidden /></button>
                        </form>
                        <form action={deleteCategory}>
                          <input type="hidden" name="id" value={ch.id} />
                          <button className="btn-3d px-1 text-xs text-slate-300 hover:text-red-500" aria-label={`Supprimer ${ch.name}`}><Trash2 size={14} aria-hidden /></button>
                        </form>
                      </li>
                    ))}
                  </ul>
                  <form action={saveCategory} className="mt-3 flex gap-2">
                    <input type="hidden" name="parentId" value={p.id} />
                    <input name="name" placeholder="Nouvelle sous-catégorie…" className={`${inputCls} flex-1`} />
                    <input name="icon" placeholder="Icône" className={`${inputCls} w-20`} aria-label="Icône" />
                    <button className="btn-3d rounded-lg bg-mint px-3 text-xs font-bold text-para-700">+ Ajouter</button>
                  </form>
                </div>
              </details>
              <form action={deleteCategory} className="border-t border-slate-50 px-5 py-2 text-right">
                <input type="hidden" name="id" value={p.id} />
                <button className="text-[11px] font-bold text-slate-300 transition hover:text-red-500">Supprimer le rayon et ses sous-catégories</button>
              </form>
            </div>
          ))}
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-8 xl:self-start">
          <h2 className="mb-4 font-display font-bold">Nouveau rayon</h2>
          <form action={saveCategory} className="space-y-3">
            <input name="name" required placeholder="Nom du rayon *" className={inputCls} />
            <select name="parentId" className={inputCls} aria-label="Rayon parent">
              <option value="">— Rayon principal —</option>
              {all.filter((c) => parents.some((p) => p.id === c.id)).map((c) => (
                <option key={c.id} value={c.id}>Sous-catégorie de : {c.name}</option>
              ))}
            </select>
            <input name="icon" placeholder="Icône (optionnel)" className={inputCls} />
            <button type="submit" className="btn-shine btn-3d w-full rounded-xl bg-gradient-to-r from-para-500 to-para-700 py-2.5 font-bold text-white">
              + Créer la catégorie
            </button>
          </form>
        </aside>
      </div>
    </>
  );
}
