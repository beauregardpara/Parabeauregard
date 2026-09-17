import { PageHeader } from "@/components/admin-shell";
import { ReputationActions } from "@/components/admin/reputation-actions";
import { isFirecrawlConfigured } from "@/lib/firecrawl";
import { db } from "@/lib/db";
import { requireAdminPagePermission } from "@/lib/auth";

export const metadata = { title: "Réputation Web — Admin", robots: { index: false } };

export default async function ReputationAdminPage() {
  await requireAdminPagePermission("reputation:read");
  const [products, analyzed, stale, errors, sourceRows] = await Promise.all([
    db.product.findMany({ where: { status: "PUBLISHED" }, orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, name: true, brand: true, reputation: true } }),
    db.productReputation.count({ where: { status: "READY" } }),
    db.productReputation.count({ where: { status: "STALE" } }),
    db.productReputation.count({ where: { status: "ERROR" } }),
    db.productReputation.findMany({ select: { totalSources: true } }),
  ]);
  const sources = sourceRows.reduce((sum, row) => sum + row.totalSources, 0);
  return <div><PageHeader title="Réputation Web" subtitle="Sources publiques observées, sans validation médicale." />
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Kpi label="Firecrawl" value={isFirecrawlConfigured() ? "Configuré" : "Non configuré"} />
      <Kpi label="Produits analysés" value={String(analyzed)} />
      <Kpi label="Sans analyse" value={String(Math.max(0, products.length - analyzed))} />
      <Kpi label="Analyses expirées" value={String(stale)} />
      <Kpi label="Sources collectées" value={String(sources)} />
    </div>
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Produit</th><th className="px-4 py-3">Marque</th><th className="px-4 py-3">Label</th><th className="px-4 py-3">Confiance</th><th className="px-4 py-3">Sources</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{products.map((product) => <tr key={product.id}><td className="max-w-xs px-4 py-3 font-semibold text-para-900">{product.name}</td><td className="px-4 py-3 text-slate-600">{product.brand ?? "—"}</td><td className="px-4 py-3">{product.reputation?.label ?? "Pas encore de données"}</td><td className="px-4 py-3 text-slate-600">{product.reputation?.confidence ?? "—"}</td><td className="px-4 py-3 text-slate-600">{product.reputation?.totalSources ?? 0}</td><td className="px-4 py-3"><ReputationActions productId={product.id} hasAnalysis={Boolean(product.reputation)} /></td></tr>)}</tbody></table></div>
    {errors > 0 && <p className="mt-4 text-xs text-coral-700">{errors} analyse(s) en erreur nécessitent une nouvelle tentative.</p>}
  </div>;
}

function Kpi({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-display text-xl font-bold text-para-900">{value}</p></div>; }
