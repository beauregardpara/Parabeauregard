import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/admin-shell";
import { StatusPill } from "@/components/status-pill";
import { getRevenueSeries, getRevenueByCategory, getPaymentSplit, getCancellationStats, getAverageBasket, getOperationsSnapshot } from "@/lib/analytics";
import { getSettingNumber, SETTING_KEYS } from "@/lib/settings";
import { Banknote, CalendarDays, ChartNoAxesColumnIncreasing, Clock3, Inbox, Mail, Package, PackageSearch, ShoppingBasket, TriangleAlert, Undo2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { requireAdminPagePermission } from "@/lib/auth";

export default async function AdminHomePage() {
  await requireAdminPagePermission("orders:read");
  const lowStockThreshold = (await getSettingNumber(SETTING_KEYS.lowStockAlerts)) || 3;
  const [totalRevenue, monthRevenue, monthOrdersCount, pendingCount, outOfStockCount, lastRuns, topSold, recentOrders, series, byCategory, paymentSplit, cancellation, avgBasket] =
    await Promise.all([
      db.order.aggregate({ _sum: { total: true }, where: { status: { not: "CANCELLED" } } }),
      db.order.aggregate({
        _sum: { total: true },
        where: {
          status: { not: "CANCELLED" },
          createdAt: { gte: new Date(new Date().setDate(1)) }, // 1er du mois
        },
      }),
      db.order.count({
        where: {
          status: { not: "CANCELLED" },
          createdAt: { gte: new Date(new Date().setDate(1)) },
        },
      }),
      db.product.count({ where: { status: "PENDING_REVIEW" } }),
      db.product.count({ where: { status: "PUBLISHED", stock: 0, unlimitedStock: false } }),
      db.scrapeRun.findMany({ orderBy: { startedAt: "desc" }, take: 5 }),
      db.product.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { soldCount: "desc" },
        take: 5,
        select: { id: true, name: true, soldCount: true, price: true, promoPrice: true },
      }),
      db.order.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { items: true } }),
      getRevenueSeries(14),
      getRevenueByCategory(),
      getPaymentSplit(),
      getCancellationStats(),
      getAverageBasket(),
    ]);
  const [ops, contactMessages] = await Promise.all([
    getOperationsSnapshot(lowStockThreshold),
    db.activityLog.findMany({ where: { action: "CONTACT" }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const messages = contactMessages.map((m) => {
    let details: { name?: string; email?: string; phone?: string; subject?: string; message?: string } = {};
    try {
      details = JSON.parse(m.details ?? "{}");
    } catch {}
    return { id: m.id, createdAt: m.createdAt, ...details };
  });

  const monthRevenueValue = monthRevenue._sum.total ?? 0;
  const maxDaily = Math.max(1, ...series.map((s) => s.revenue));

  const kpis = [
    { label: "Commandes aujourd'hui", value: String(ops.ordersToday), icon: CalendarDays, href: "/admin/commandes" },
    { label: "CA aujourd'hui", value: formatPrice(ops.revenueToday), icon: Banknote },
    { label: "À traiter", value: String(ops.toProcess), icon: Inbox, href: "/admin/commandes" },
    { label: "CA 7 jours", value: formatPrice(ops.revenue7d), icon: ChartNoAxesColumnIncreasing },
    { label: "CA 30 jours", value: formatPrice(ops.revenue30d), icon: ChartNoAxesColumnIncreasing },
    { label: `Stock faible (≤ ${lowStockThreshold})`, value: String(ops.lowStock), icon: PackageSearch, href: "/admin/produits?stock=faible" },
    { label: "CA total", value: formatPrice(totalRevenue._sum.total ?? 0), icon: Banknote, href: "/admin/commandes" },
    { label: "CA ce mois", value: formatPrice(monthRevenueValue), icon: ChartNoAxesColumnIncreasing },
    { label: "Commandes du mois", value: String(monthOrdersCount), icon: Package, href: "/admin/commandes" },
    { label: "Panier moyen", value: formatPrice(avgBasket), icon: ShoppingBasket },
    { label: "À valider", value: String(pendingCount), icon: Clock3, href: "/admin/produits?statut=PENDING_REVIEW" },
    { label: "Annulations 7 j", value: `${cancellation.recentRate.toFixed(0)}%`, icon: Undo2, href: "/admin/commandes" },
    { label: "Ruptures", value: String(outOfStockCount), icon: TriangleAlert, href: "/admin/produits?statut=RUPTURE" },
  ];

  return (
    <>
      <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble de votre parapharmacie en temps réel." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <StatCard key={k.label} {...k} />
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        {/* Dernières commandes */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 className="font-display font-bold">Dernières commandes</h2>
            <Link href="/admin/commandes" className="text-xs font-bold text-para-600 hover:underline">Tout voir →</Link>
          </header>
          {recentOrders.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">Aucune commande pour le moment.</p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {recentOrders.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/commandes/${o.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-mint/40">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-para-50 text-para-700"><Package size={17} strokeWidth={1.7} aria-hidden /></span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm">{o.reference}</strong>
                      <span className="text-xs text-slate-400">{o.fullName} · {formatDate(o.createdAt)}</span>
                    </span>
                    <strong className="text-sm">{formatPrice(o.total)}</strong>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Messages de contact */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 className="font-display font-bold">Derniers messages de contact</h2>
            <Link href="/admin/journal" className="text-xs font-bold text-para-600 hover:underline">Journal →</Link>
          </header>
          {messages.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">Aucun message pour le moment.</p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {messages.map((m) => (
                <li key={m.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-para-50 text-para-700"><Mail size={17} strokeWidth={1.7} aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm">{m.subject ?? "Demande de contact"}</strong>
                    <span className="block text-xs text-slate-400">
                      {m.name} · {m.email ? <a href={`mailto:${m.email}`} className="text-para-700 hover:underline">{m.email}</a> : null}
                      {m.phone ? <> · <a href={`tel:${m.phone}`} className="text-para-700 hover:underline">{m.phone}</a></> : null} · {formatDate(m.createdAt)}
                    </span>
                    {m.message && <span className="mt-1 line-clamp-2 block text-xs text-slate-600">{m.message}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Top ventes */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 px-5 py-3.5">
            <h2 className="font-display font-bold">Top ventes</h2>
          </header>
          <ul className="divide-y divide-slate-50">
            {topSold.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-extrabold ${
                  i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-mint text-para-600"
                }`}>{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                <span className="text-xs font-bold text-para-700">{p.soldCount} vendus</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Tendances 14 jours */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <header className="mb-4 flex items-center justify-between">
            <h2 className="font-display font-bold">CA journalier (14 j)</h2>
            <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-para-700">
              {series.reduce((s, d) => s + d.orders, 0)} commandes
            </span>
          </header>
          <div className="flex h-40 items-end gap-1.5 sm:gap-2" role="img" aria-label="Chiffre d'affaires des 14 derniers jours">
            {series.map((s) => (
              <div key={s.day} title={`${s.day} : ${formatPrice(s.revenue)} (${s.orders} cmd)`} className="group relative flex flex-1 flex-col items-center justify-end self-end">
                <span className="pointer-events-none mb-1 hidden rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-white opacity-0 transition group-hover:opacity-100">
                  {formatPrice(s.revenue)}
                </span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-para-700 to-para-400 transition hover:from-para-800"
                  style={{ height: `${Math.max(3, (s.revenue / maxDaily) * 100)}%` }}
                />
                <span className="mt-1 text-[9px] text-slate-400">{s.day.slice(5)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Répartitions CA par catégorie + paiement */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-display font-bold">CA par catégorie</h2>
          {byCategory.length === 0 ? (
            <p className="text-sm text-slate-400">Pas encore de données.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {byCategory.slice(0, 6).map((c) => (
                <li key={c.category}>
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-para-800">{c.category}</span>
                    <span className="text-slate-500">{formatPrice(c.revenue)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-para-500 to-para-700" style={{ width: `${(c.revenue / (byCategory[0]?.revenue || 1)) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Paiement */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-display font-bold">Méthodes de paiement</h2>
          {paymentSplit.length === 0 ? (
            <p className="text-sm text-slate-400">Pas encore de données.</p>
          ) : (
            <ul className="space-y-2">
              {paymentSplit.map((p) => (
                <li key={p.method} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-semibold text-para-800">{p.method === "COD" ? "Paiement à la livraison" : "Carte bancaire"}</span>
                  <span className="text-slate-500">{p.count} cmd · {formatPrice(p.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Scraper */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 className="font-display font-bold">Dernières exécutions du scraper</h2>
            <Link href="/admin/scraper" className="text-xs font-bold text-para-600 hover:underline">Gérer →</Link>
          </header>
          {lastRuns.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">
              Aucune exécution — lancez votre premier scraping depuis la page « Scraper & sources ».
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                  <tr><th className="px-5 py-2.5">Source</th><th className="px-5 py-2.5">Début</th><th className="px-5 py-2.5">Ajoutés</th><th className="px-5 py-2.5">Modifiés</th><th className="px-5 py-2.5">Erreurs</th><th className="px-5 py-2.5">Statut</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {lastRuns.map((r) => (
                    <tr key={r.id}>
                      <td className="px-5 py-2.5 font-semibold">{r.sourceName}</td>
                      <td className="px-5 py-2.5 text-slate-500">{formatDate(r.startedAt)}</td>
                      <td className="px-5 py-2.5 text-emerald-600">+{r.addedCount}</td>
                      <td className="px-5 py-2.5 text-para-700">~{r.updatedCount}</td>
                      <td className={`px-5 py-2.5 ${r.errorCount > 0 ? "text-red-500" : "text-slate-300"}`}>{r.errorCount}</td>
                      <td className="px-5 py-2.5">
                        <StatusPill status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function StatCard({ label, value, icon: Icon, href }: { label: string; value: string; icon: LucideIcon; href?: string }) {
  const inner = (
    <div className="card-3d rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="text-para-700" aria-hidden><Icon size={21} strokeWidth={1.7} /></span>
      <p className="mt-2 font-display text-xl font-extrabold text-para-900 sm:text-2xl">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
