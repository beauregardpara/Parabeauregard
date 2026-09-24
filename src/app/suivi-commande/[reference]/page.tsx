import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentCustomer } from "@/lib/auth";
import { formatPrice, formatDate } from "@/lib/format";
import { statusLabel } from "@/lib/order-status";

export const metadata: Metadata = { title: "Suivi de commande — Para Beauregard", robots: { index: false } };

const STATUS_ICON: Record<string, string> = {
  NEW: "🕐",
  PREPARING: "🧴",
  SHIPPED: "🚚",
  DELIVERED: "✅",
  CANCELLED: "✕",
};

export default async function SuiviCommandesDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { reference } = await params;
  const { token } = await searchParams;

  // Sécurité : on ne cherche JAMAIS par ID séquentiel, uniquement par référence opaque.
  const order = await db.order.findUnique({
    where: { reference: reference.toUpperCase() },
    include: {
      items: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();

  const customer = await getCurrentCustomer();
  const isOwner = customer != null && order.customerId === customer.id;
  const hasToken = Boolean(token) && order.confirmationToken != null && token === order.confirmationToken;
  const canView = isOwner || hasToken;

  if (!canView) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-4xl" aria-hidden>🔒</p>
        <h1 className="mt-4 font-display text-2xl font-extrabold text-para-950">Accès restreint</h1>
        <p className="mt-2 text-sm text-slate-600">
          Pour consulter cette commande, ouvrez le lien reçu par email ou connectez-vous au compte ayant passé la commande.
        </p>
        <Link href="/suivi-commande" className="mt-6 inline-block rounded-full bg-para-600 px-6 py-3 text-sm font-semibold text-white">
          Retour au formulaire de suivi
        </Link>
      </div>
    );
  }

  const currentIndex = Math.max(0, order.statusHistory.length - 1);
  const orderStatus = order.status;

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl font-extrabold text-para-950">Suivi de la commande</h1>
        <p className="mt-1 text-sm text-slate-500">
          <strong className="text-para-800">{order.reference}</strong> · passée le {formatDate(order.createdAt)}
        </p>
      </div>

      {/* Résumé statut courant */}
      <div className="rounded-3xl border border-para-100 bg-white p-6 text-center shadow-sm">
        <p className="text-4xl" aria-hidden>{STATUS_ICON[order.status] ?? "📦"}</p>
        <p className="mt-2 font-display text-xl font-extrabold text-para-900">{statusLabel(order.status)}</p>
        {order.status === "CANCELLED" ? (
          <p className="mt-1 text-sm text-red-500">Cette commande a été annulée.</p>
        ) : order.status === "DELIVERED" ? (
          <p className="mt-1 text-sm text-emerald-600">Commande livrée. Merci pour votre confiance !</p>
        ) : (
          <p className="mt-1 text-sm text-slate-500">Votre commande est en cours de traitement.</p>
        )}
      </div>

      {/* Timeline */}
      <section className="mt-8 rounded-3xl border border-para-100 bg-white p-6 shadow-sm" aria-label="Historique des statuts">
        <h2 className="mb-5 font-display text-lg font-bold text-para-900">Historique</h2>
        {order.statusHistory.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun événement enregistré pour le moment.</p>
        ) : (
          <ol className="relative space-y-6 border-l-2 border-para-100 pl-6">
            {order.statusHistory.map((h) => {
              const isLatest = h.id === order.statusHistory[currentIndex]?.id && h.to === orderStatus;
              return (
                <li key={h.id} className="relative">
                  <span
                    className={`absolute -left-[31px] grid h-5 w-5 place-items-center rounded-full border-2 text-[10px] ${
                      isLatest ? "border-para-600 bg-para-600 text-white" : "border-para-200 bg-white"
                    }`}
                    aria-hidden
                  >
                    {isLatest ? "●" : "·"}
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <strong className={`text-sm ${isLatest ? "text-para-800" : "text-slate-600"}`}>
                      {STATUS_ICON[h.to] ?? ""} {statusLabel(h.to)}
                    </strong>
                    <time className="text-xs text-slate-500">{formatDate(h.createdAt)}</time>
                  </div>
                  {h.note && <p className="mt-0.5 text-xs text-slate-500">{h.note}</p>}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Détail de la commande (réservé au propriétaire / détenteur du jeton) */}
      <section className="mt-8 rounded-3xl border border-para-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-display text-lg font-bold text-para-900">Récapitulatif</h2>
        <ul className="divide-y divide-para-50">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <Link href={`/produits/${i.productSlug}`} className="min-w-0 flex-1 truncate hover:text-para-700">
                {i.productName} <span className="text-slate-500">× {i.quantity}</span>
              </Link>
              <strong>{formatPrice(i.unitPrice * i.quantity)}</strong>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-dashed border-para-100 pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Sous-total</dt><dd>{formatPrice(order.subtotal)}</dd></div>
          {order.discount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <dt>Réduction {order.couponCode ? `(${order.couponCode})` : ""}</dt><dd>-{formatPrice(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between"><dt className="text-slate-500">Livraison</dt><dd>{order.shippingCost === 0 ? "Gratuite" : formatPrice(order.shippingCost)}</dd></div>
          <div className="flex justify-between pt-1.5 text-base font-extrabold text-para-900"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
        </dl>
        <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-center text-xs text-slate-500">
          Paiement à la livraison : {order.paid ? "encaissé ✅" : "à régler au livreur (espèces)"}
        </p>
      </section>

      <div className="mt-8 text-center">
        <Link href="/suivi-commande" className="text-sm font-semibold text-para-600 hover:underline">
          ← Suivre une autre commande
        </Link>
      </div>
    </div>
  );
}