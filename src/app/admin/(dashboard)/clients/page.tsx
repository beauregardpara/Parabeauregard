import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/admin-shell";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const PAGE_SIZE = 30;
  const page = Math.max(1, parseInt(sp.page ?? "1") || 1);

  const where = sp.q
    ? { OR: [{ email: { contains: sp.q } }, { firstName: { contains: sp.q } }, { lastName: { contains: sp.q } }] }
    : {};

  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        orders: { where: { status: { not: "CANCELLED" } }, select: { total: true } },
        _count: { select: { orders: true } },
      },
    }),
    db.customer.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    Object.entries({ ...sp, ...extra }).forEach(([k, v]) => v && p.set(k, v));
    return `/admin/clients?${p.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={`${total} client(s) enregistré(s).`}
        action={
          <form action="/admin/clients" className="flex gap-2">
            <input name="q" placeholder="Rechercher nom ou email…" defaultValue={sp.q}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-para-400" />
            <button className="btn-3d rounded-xl bg-para-800 px-4 py-2 text-sm font-semibold text-white">🔍</button>
          </form>
        }
      />

      <div className="mb-4 text-xs font-semibold text-slate-400">
        {total} résultat{total > 1 ? "s" : ""} · page {page}/{totalPages}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Téléphone</th>
              <th className="px-4 py-3">Points fidélité</th>
              <th className="px-4 py-3">Commandes</th>
              <th className="px-4 py-3">CA généré</th>
              <th className="px-4 py-3">Inscription</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {customers.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Aucun client trouvé.</td></tr>
            )}
            {customers.map((c) => (
              <tr key={c.id} className="transition hover:bg-mint/30">
                <td className="px-4 py-3 font-semibold">{c.firstName} {c.lastName}</td>
                <td className="max-w-[220px] truncate px-4 text-slate-500">{c.email}</td>
                <td className="px-4 text-slate-500">{c.phone ?? "—"}</td>
                <td className="px-4 text-para-700">{c.loyaltyPoints}</td>
                <td className="px-4">{c._count.orders}</td>
                <td className="px-4 font-bold text-para-700">{formatPrice(c.orders.reduce((s, o) => s + o.total, 0))}</td>
                <td className="whitespace-nowrap px-4 text-xs text-slate-400">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="mt-6 flex justify-center gap-2" aria-label="Pagination">
          {page > 1 && (
            <Link href={qs({ page: String(page - 1) })}
              className="btn-3d rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-mint">
              ←
            </Link>
          )}
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-para-700 text-xs font-bold text-white">{page}</span>
          {page < totalPages && (
            <Link href={qs({ page: String(page + 1) })}
              className="btn-3d rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-mint">
              →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}