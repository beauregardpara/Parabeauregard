import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { logoutCustomer } from "@/lib/actions/customer";
import { FavoritesSection } from "@/components/favorites-section";
import { formatDate, formatPrice } from "@/lib/format";
import { getSettingNumber, SETTING_KEYS } from "@/lib/settings";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false } };

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700",
  PREPARING: "bg-amber-50 text-amber-700",
  SHIPPED: "bg-indigo-50 text-indigo-700",
  DELIVERED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-600",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "Reçue",
  PREPARING: "En préparation",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
};

export default async function AccountPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/compte/connexion");

  const [orders, pointsPerDhs] = await Promise.all([
    db.order.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      include: { items: true },
      take: 20,
    }),
    // Taux de fidélité centralisé : ne jamais le réécrire en dur dans le texte.
    getSettingNumber(SETTING_KEYS.loyaltyPointsPerDhs),
  ]);

  // Programme désactivé (taux à 0) → on n'affiche aucune promesse de points.
  const loyaltyRate =
    pointsPerDhs <= 0
      ? null
      : pointsPerDhs >= 1
        ? `${pointsPerDhs % 1 === 0 ? pointsPerDhs : pointsPerDhs.toFixed(2)} pt${pointsPerDhs > 1 ? "s" : ""} par DH dépensé`
        : `1 pt par ${Math.round(1 / pointsPerDhs)} DH dépensés`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-para-950">
            Bonjour, {customer.firstName} 👋
          </h1>
          <p className="text-sm text-slate-500">{customer.email}</p>
        </div>
        <form action={logoutCustomer}>
          <button className="btn-3d rounded-full border border-para-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-mint">
            Se déconnecter
          </button>
        </form>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {([
          ["Points fidélité", `${customer.loyaltyPoints} pts`],
          ["Commandes", String(orders.length)],
          ["Total dépensé", formatPrice(orders.reduce((s: number, o) => s + o.total, 0))],
          ["Membre depuis", formatDate(customer.createdAt).slice(0, 12)],
        ] as const).map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-para-100 bg-gradient-to-br from-white to-mint p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 font-display text-xl font-extrabold text-para-800">{value}</p>
          </div>
        ))}
      </div>

      {loyaltyRate && (
        <div className="mb-8 flex items-center gap-3 rounded-2xl border border-para-100 bg-emerald-50/60 p-4 text-sm">
          <span className="text-2xl" aria-hidden>⭐</span>
          <p className="text-slate-700">
            <strong>Programme fidélité :</strong> gagnez {loyaltyRate} à chaque commande et profitez
            de votre solde en magasin.
          </p>
        </div>
      )}

      <section className="rounded-3xl border border-para-100 bg-white shadow-sm">
        <h2 className="border-b border-para-50 px-6 py-4 font-display text-lg font-bold text-para-900">Mes commandes</h2>
        {orders.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="text-4xl" aria-hidden>📦</span>
            <p className="mt-3 text-sm text-slate-500">Aucune commande pour le moment.</p>
            <Link href="/" className="mt-4 inline-block rounded-full bg-gradient-to-r from-para-500 to-para-700 px-6 py-2.5 text-sm font-semibold text-white">
              Découvrir la boutique
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-para-50">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/commande/${o.reference}`} className="font-bold text-para-800 hover:underline">
                    {o.reference}
                  </Link>
                  <p className="text-xs text-slate-400">{formatDate(o.createdAt)} · {o.items.length} article(s)</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[o.status]}`}>
                  {STATUS_LABELS[o.status]}
                </span>
                <strong>{formatPrice(o.total)}</strong>
                <Link href={`/commande/${o.reference}`} className="text-sm font-semibold text-para-600 hover:underline">
                  Détails →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {customer.addresses.length > 0 && (
        <section className="mt-8 rounded-3xl border border-para-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-display text-lg font-bold text-para-900">Mes adresses</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {customer.addresses.map((a) => (
              <div key={a.id} className="rounded-2xl border border-para-100 bg-mint/40 p-4 text-sm">
                <strong>{a.label}</strong> {a.isDefault && <span className="ml-1 rounded-full bg-para-100 px-2 py-0.5 text-[10px] font-bold text-para-700">Par défaut</span>}
                <p className="mt-1 text-slate-600">{a.fullName}<br />{a.street}<br />{a.city} {a.postalCode ?? ""}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <FavoritesSection />
    </div>
  );
}
