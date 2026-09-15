import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/admin-shell";

const ENTITY_FILTERS = [
  { value: "Product", label: "Produits" },
  { value: "Order", label: "Commandes" },
  { value: "Category", label: "Catégories" },
  { value: "Coupon", label: "Codes promo" },
  { value: "AdminUser", label: "Utilisateurs" },
  { value: "Review", label: "Avis" },
  { value: "ReturnRequest", label: "Retours" },
  { value: "Setting", label: "Réglages" },
];

export default async function AdminJournalPage({
  searchParams,
}: {
  searchParams: Promise<{ entite?: string }>;
}) {
  const { entite } = await searchParams;
  const entity = entite && ENTITY_FILTERS.some((f) => f.value === entite) ? entite : undefined;

  const [logs, total, perEntity] = await Promise.all([
    db.activityLog.findMany({
      where: entity ? { entity } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { adminUser: { select: { name: true } } },
    }),
    db.activityLog.count(),
    db.activityLog.groupBy({ by: ["entity"], _count: { _all: true } }),
  ]);

  const entityCounts = new Map(perEntity.map((e) => [e.entity ?? "", e._count._all]));

  return (
    <>
      <PageHeader title="Journal d'activité" subtitle="Qui a modifié quoi, et quand." />

      <div className="mb-5 flex flex-wrap gap-2">
        <FilterChip href="/admin/journal" active={!entity} label={`Toutes (${total})`} />
        {ENTITY_FILTERS.map((f) => (
          <FilterChip
            key={f.value}
            href={`/admin/journal?entite=${f.value}`}
            active={entity === f.value}
            label={`${f.label} (${entityCounts.get(f.value) ?? 0})`}
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {logs.length === 0 ? (
          <p className="px-4 py-14 text-center text-slate-400">Aucune activité pour ce filtre.</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {logs.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-mint text-xs" aria-hidden>✎</span>
                <div className="min-w-0 flex-1">
                  <strong>{l.action}</strong>
                  {l.entity && <span className="ml-1.5 text-xs text-slate-400">{l.entity}{l.entityId ? ` #${l.entityId}` : ""}</span>}
                  {l.details && <span className="block truncate text-xs text-slate-500">{l.details}</span>}
                  {l.ip && <span className="block text-[10px] text-slate-300">IP : {l.ip}</span>}
                </div>
                <span className="text-xs font-semibold text-para-700">{l.adminUser?.name ?? "Système"}</span>
                <span className="text-xs text-slate-400">{formatDate(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
        active ? "bg-para-600 text-white shadow-sm" : "bg-white text-para-700 ring-1 ring-para-100 hover:bg-mint"
      }`}
    >
      {label}
    </Link>
  );
}