import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/admin-shell";
import { StatusPill } from "@/components/status-pill";
import { decideReturn } from "@/lib/actions/returns";
import { Undo2 } from "lucide-react";
import { requireAdminPagePermission } from "@/lib/auth";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Refusée",
};

export const metadata = { title: "Retours — Admin", robots: { index: false } };

export default async function AdminReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  await requireAdminPagePermission("orders:read");
  const { statut } = await searchParams;
  const statusFilter = statut && ["PENDING", "APPROVED", "REJECTED"].includes(statut) ? statut : undefined;

  const returns = await db.returnRequest.findMany({
    where: statusFilter ? { status: statusFilter as never } : undefined,
    include: { order: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const [pending, approved, rejected] = await Promise.all([
    db.returnRequest.count({ where: { status: "PENDING" } }),
    db.returnRequest.count({ where: { status: "APPROVED" } }),
    db.returnRequest.count({ where: { status: "REJECTED" } }),
  ]);

  return (
    <>
      <PageHeader title="Demandes de retour" subtitle="Traitement des retours clients (commandes livrées)." />

      <div className="mb-6 flex flex-wrap gap-3">
        <FilterChip href="/admin/retours" active={!statusFilter} label={`Toutes (${pending + approved + rejected})`} />
        <FilterChip href="/admin/retours?statut=PENDING" active={statusFilter === "PENDING"} label={`En attente (${pending})`} />
        <FilterChip href="/admin/retours?statut=APPROVED" active={statusFilter === "APPROVED"} label={`Approuvées (${approved})`} />
        <FilterChip href="/admin/retours?statut=REJECTED" active={statusFilter === "REJECTED"} label={`Refusées (${rejected})`} />
      </div>

      {returns.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
          Aucune demande de retour.
        </div>
      ) : (
        <div className="space-y-4">
          {returns.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-50 text-orange-700" aria-hidden><Undo2 size={17} strokeWidth={1.7} /></span>
                  <div>
                    <Link className="block text-sm font-bold text-para-800 hover:underline" href={`/admin/commandes/${r.orderId}`}>
                      Commande {r.order.reference}
                    </Link>
                    <p className="text-xs text-slate-400">{r.email} · {formatDate(r.createdAt)}</p>
                  </div>
                </div>
                <StatusPill status={r.status} label={STATUS_LABEL[r.status] ?? r.status} />
              </div>

              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
                <p><strong>Raison :</strong> {r.reason}</p>
                {r.details && <p className="mt-1 text-slate-600">{r.details}</p>}
              </div>

              {r.status === "PENDING" ? (
                <form action={decideReturn} className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl bg-mint/40 p-3">
                  <input type="hidden" name="id" value={r.id} />
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`note-${r.id}`} className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Note envoyée au client</label>
                    <input id={`note-${r.id}`} name="adminNote" placeholder="Ex. : nous vous remboursons à la réception…" maxLength={500}
                      className="w-full rounded-xl border border-para-100 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-para-200" />
                  </div>
                  <button type="submit" name="decision" value="APPROVED"
                    className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                    Approuver
                  </button>
                  <button type="submit" name="decision" value="REJECTED"
                    className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600">
                    Refuser
                  </button>
                </form>
              ) : (
                r.adminNote && <p className="mt-3 text-xs text-slate-500"><strong>Réponse :</strong> {r.adminNote}</p>
              )}
            </div>
          ))}
        </div>
      )}
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
