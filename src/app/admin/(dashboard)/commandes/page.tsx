import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/format";
import { updateOrderStatus } from "@/lib/actions/admin";
import { StatusPill } from "@/components/status-pill";
import { PageHeader } from "@/components/admin-shell";
import { requireAdminPagePermission } from "@/lib/auth";
import { VALID_ORDER_STATES } from "@/lib/order-status";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; page?: string; q?: string }>;
}) {
  await requireAdminPagePermission("orders:read");
  const sp = await searchParams;
  const status = (VALID_ORDER_STATES as readonly string[]).includes(sp.statut ?? "")
    ? (sp.statut as (typeof VALID_ORDER_STATES)[number])
    : undefined;
  // Recherche par référence, téléphone, nom ou email (variantes de casse pour PostgreSQL).
  const q = sp.q?.trim() ?? "";
  const variants = [...new Set([q, q.toUpperCase(), q.toLowerCase(), q.charAt(0).toUpperCase() + q.slice(1).toLowerCase()])].filter(Boolean);
  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: variants.flatMap((v) => [
            { reference: { contains: v } },
            { phone: { contains: v } },
            { fullName: { contains: v } },
            { email: { contains: v } },
          ]),
        }
      : {}),
  };

  const PAGE_SIZE = 30;
  const page = Math.max(1, parseInt(sp.page ?? "1") || 1);
  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { items: true },
    }),
    db.order.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const tabs = [
    ["", "Toutes"],
    ["NEW", "Nouvelles"],
    ["PREPARING", "En préparation"],
    ["SHIPPED", "Expédiées"],
    ["DELIVERED", "Livrées"],
    ["CANCELLED", "Annulées"],
  ] as const;

  return (
    <>
      <PageHeader title="Commandes" subtitle="Suivez et faites évoluer le statut de chaque commande." />

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        {status && <input type="hidden" name="statut" value={status} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Référence, téléphone, nom ou email…"
          aria-label="Rechercher une commande"
          className="admin-input min-w-[240px] flex-1"
        />
        <button type="submit" className="btn-3d rounded-full bg-para-700 px-4 py-1.5 text-xs font-bold text-white">Rechercher</button>
        {q && <Link href={status ? `/admin/commandes?statut=${status}` : "/admin/commandes"} className="self-center text-xs font-bold text-para-700 hover:underline">Effacer</Link>}
      </form>

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map(([val, label]) => (
          <Link key={val} href={val ? `/admin/commandes?statut=${val}` : "/admin/commandes"}
            className={`btn-3d rounded-full px-4 py-1.5 text-xs font-bold transition ${
              (sp.statut ?? "") === val ? "bg-gradient-to-r from-para-600 to-para-700 text-white shadow" : "border border-slate-200 bg-white text-slate-500 hover:bg-mint"
            }`}>
            {label}
          </Link>
        ))}
      </div>

      <div className="mb-4 text-xs font-semibold text-slate-400">
        {total} commande{total > 1 ? "s" : ""} · page {page}/{totalPages}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[780px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Référence</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Articles</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Paiement</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {orders.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Aucune commande.</td></tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="transition hover:bg-mint/30">
                <td className="px-4 py-3 font-bold text-para-800">
                  <Link href={`/admin/commandes/${o.id}`} className="hover:underline">{o.reference}</Link>
                </td>
                <td className="px-4">
                  {o.fullName}
                  <span className="block text-xs text-slate-400">{o.phone}</span>
                </td>
                <td className="whitespace-nowrap px-4 text-xs text-slate-400">{formatDate(o.createdAt)}</td>
                <td className="px-4">{o.items.length}</td>
                <td className="whitespace-nowrap px-4 font-bold">{formatPrice(o.total)}</td>
                <td className="px-4 text-xs">💵 À la livraison {o.paid && "✓"}</td>
                <td className="px-4"><StatusPill status={o.status} /></td>
                <td className="px-4">
                  <form action={updateOrderStatus} className="flex items-center gap-1.5">
                    <input type="hidden" name="id" value={o.id} />
                    <select name="status" defaultValue={o.status}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-para-400">
                      <option value="NEW">Reçue</option>
                      <option value="PREPARING">Préparation</option>
                      <option value="SHIPPED">Expédiée</option>
                      <option value="DELIVERED">Livrée</option>
                      <option value="CANCELLED">Annulée</option>
                    </select>
                    <button className="btn-3d rounded-lg bg-para-50 px-2.5 py-1.5 text-xs font-bold text-para-700 hover:bg-para-100" aria-label={`Mettre à jour ${o.reference}`}>✓</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link href={`/admin/commandes?statut=${status ?? ""}&q=${encodeURIComponent(q)}&page=${page - 1}`}
              className="btn-3d rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-mint">
              ← Précédente
            </Link>
          )}
          <span className="text-xs font-bold text-slate-500">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={`/admin/commandes?statut=${status ?? ""}&q=${encodeURIComponent(q)}&page=${page + 1}`}
              className="btn-3d rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-mint">
              Suivante →
            </Link>
          )}
        </div>
      )}
    </>
  );
}
