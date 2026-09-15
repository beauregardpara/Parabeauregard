import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/admin-shell";
import { ISSUE_LABELS, SEVERITY_LABELS, recomputeCatalogQuality } from "@/lib/scraper/quality";
import { Beaker, FileText, Image as ImageIcon, SearchCheck } from "lucide-react";

export const metadata = { title: "Qualité catalogue — Admin" };

const VALID_SEVERITIES = new Set(["1", "2", "3"]);

async function resolveQualityIssue(formData: FormData) {
  "use server";
  await requireRole("CATALOG_MANAGER", "SUPER_ADMIN");
  const rawId = formData.get("id");
  if (!rawId) return;
  const id = Number(rawId);
  if (!Number.isInteger(id)) return;
  await db.dataQualityIssue.updateMany({
    where: { id, status: "OPEN" },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });
  revalidatePath("/admin/quality");
}

async function recomputeQuality() {
  "use server";
  await requireRole("CATALOG_MANAGER", "SUPER_ADMIN");
  await recomputeCatalogQuality();
  revalidatePath("/admin/quality");
}

export default async function AdminQualityPage({
  searchParams,
}: {
  searchParams: Promise<{ severite?: string }>;
}) {
  const sp = await searchParams;
  const severite = sp.severite && VALID_SEVERITIES.has(sp.severite) ? sp.severite : null;

  const [publishedCount, scoreAvg, bySeverity, noImageCount, noDescriptionCount, openIssues] =
    await Promise.all([
      db.product.count({ where: { status: "PUBLISHED" } }),
      db.product.aggregate({
        where: { status: "PUBLISHED" },
        _avg: { qualityScore: true },
      }),
      db.dataQualityIssue.groupBy({
        by: ["severity"],
        where: { status: "OPEN" },
        _count: { _all: true },
      }),
      db.product.count({ where: { status: "PUBLISHED", images: { none: {} } } }),
      db.product.count({
        where: { status: "PUBLISHED", description: null, shortDescription: null },
      }),
      db.dataQualityIssue.findMany({
        where: { status: "OPEN", ...(severite ? { severity: Number(severite) } : {}) },
        orderBy: { createdAt: "desc" },
        include: { product: { select: { id: true, name: true, slug: true } } },
        take: 100,
      }),
    ]);

  const severityCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  for (const row of bySeverity) severityCounts[row.severity] = row._count._all;
  const totalOpen = bySeverity.reduce((sum, row) => sum + row._count._all, 0);

  const averageScore = scoreAvg._avg.qualityScore;

  const kpis = [
    {
      label: "Score moyen",
      value: averageScore != null ? `${Math.round(averageScore)} / 100` : "—",
      icon: Beaker,
      sub: `${publishedCount} produit(s) publié(s)`,
    },
    {
      label: "Anomalies ouvertes",
      value: String(totalOpen),
      icon: SearchCheck,
      sub: `${severityCounts[3]} bloquante(s) · ${severityCounts[2]} importante(s) · ${severityCounts[1]} mineure(s)`,
    },
    {
      label: "Produits sans image",
      value: String(noImageCount),
      icon: ImageIcon,
      sub: "parmi les produits publiés",
    },
    {
      label: "Sans description",
      value: String(noDescriptionCount),
      icon: FileText,
      sub: "ni résumé renseigné",
    },
  ];

  const tabs = [
    ["", "Toutes"],
    ["3", "Bloquant"],
    ["2", "Important"],
    ["1", "Mineur"],
  ] as const;

  return (
    <>
      <PageHeader
        title="Qualité catalogue"
        subtitle="Détection automatique des fiches incomplètes ou incohérentes."
        action={
          <form action={recomputeQuality}>
            <button className="btn-shine btn-3d rounded-xl bg-gradient-to-r from-para-500 to-para-700 px-4 py-2.5 text-sm font-bold text-white">
              ↻ Recalculer la qualité
            </button>
          </form>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card-3d rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-para-700" aria-hidden><k.icon size={21} strokeWidth={1.7} /></span>
            <p className="mt-2 font-display text-xl font-extrabold text-para-900 sm:text-2xl">{k.value}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k.label}</p>
            {k.sub && <p className="mt-1 text-[11px] text-slate-400">{k.sub}</p>}
          </div>
        ))}
      </div>

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Sévérité :</span>
          {tabs.map(([val, label]) => (
            <Link
              key={val}
              href={val ? `/admin/quality?severite=${val}` : "/admin/quality"}
              className={`btn-3d rounded-full px-4 py-1.5 text-xs font-bold transition ${
                (sp.severite ?? "") === val
                  ? "bg-gradient-to-r from-para-600 to-para-700 text-white shadow"
                  : "border border-slate-200 bg-white text-slate-500 hover:bg-mint"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {openIssues.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-14 text-center text-slate-400">
            {severite
              ? "Aucune anomalie ouverte à cette sévérité."
              : "Aucune anomalie ouverte — le catalogue est sain."}
          </p>
        ) : (
          <div className="space-y-3">
            {openIssues.map((issue) => (
              <article
                key={issue.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  {issue.product ? (
                    <Link href={`/admin/produits/${issue.product.id}`} className="font-semibold hover:text-para-700">
                      {issue.product.name}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-slate-400">Produit supprimé</span>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                      {ISSUE_LABELS[issue.type] ?? issue.type}
                    </span>
                    <SeverityBadge severity={issue.severity} />
                    <span className="text-xs text-slate-400">créée le {formatDate(issue.createdAt)}</span>
                  </div>
                  {issue.details && <p className="mt-1.5 text-sm text-slate-600">{issue.details}</p>}
                </div>
                <form action={resolveQualityIssue}>
                  <input type="hidden" name="id" value={issue.id} />
                  <button className="btn-3d rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
                    ✓ Résoudre
                  </button>
                </form>
              </article>
            ))}
            {openIssues.length >= 100 && (
              <p className="text-center text-xs text-slate-400">Affichage limité aux 100 dernières anomalies.</p>
            )}
          </div>
        )}
      </section>
    </>
  );
}

function SeverityBadge({ severity }: { severity: number }) {
  const styles: Record<number, string> = {
    3: "bg-red-50 text-red-600",
    2: "bg-amber-50 text-amber-700",
    1: "bg-blue-50 text-blue-700",
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${styles[severity] ?? "bg-slate-100 text-slate-600"}`}
    >
      {SEVERITY_LABELS[String(severity)] ?? `Sévérité ${severity}`}
    </span>
  );
}
