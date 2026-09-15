import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentCustomer } from "@/lib/auth";
import { formatPrice, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Commande confirmée", robots: { index: false } };

const STATUS_LABELS: Record<string, string> = {
  NEW: "Reçue — en attente de préparation",
  PREPARING: "En cours de préparation",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
};

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { reference } = await params;
  const { token } = await searchParams;

  const order = await db.order.findUnique({
    where: { reference },
    include: { items: true },
  });
  if (!order) notFound();

  // Contrôle d'accès : propriétaire connecté OU détenteur du jeton de confirmation
  const customer = await getCurrentCustomer();
  const isOwner = customer != null && order.customerId === customer.id;
  const hasToken = Boolean(token) && order.confirmationToken != null && token === order.confirmationToken;
  const canView = isOwner || hasToken;

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <div className="rounded-[2rem] border border-para-100 bg-gradient-to-b from-mint to-white p-8 text-center shadow-soft sm:p-12">
        <span className="pulse-ring mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-para-600 text-4xl text-white shadow-lift">
          ✓
        </span>
        <h1 className="mt-6 font-display text-3xl font-extrabold text-para-950">Merci pour votre commande !</h1>
        <p className="mt-2 text-slate-600">
          Votre commande <strong className="text-para-800">{order.reference}</strong> a bien été enregistrée.
          Préparez le montant exact pour le livreur.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Un email récapitulatif vous sera envoyé. Statut : <strong>{STATUS_LABELS[order.status]}</strong>
        </p>
      </div>

      <div className="mt-8 rounded-3xl border border-para-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-para-900">Détail de la commande</h2>
          <span className="text-xs text-slate-400">{formatDate(order.createdAt)}</span>
        </div>

        <ul className="divide-y divide-para-50">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <Link href={`/produits/${i.productSlug}`} className="min-w-0 flex-1 truncate hover:text-para-700">
                {i.productName} <span className="text-slate-400">× {i.quantity}</span>
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
          {order.pointsEarned > 0 && (
            <div className="flex justify-between"><dt className="text-slate-500">Points fidélité gagnés</dt><dd className="font-semibold text-para-700">+{order.pointsEarned}</dd></div>
          )}
          <div className="flex justify-between pt-1.5 text-base font-extrabold text-para-900"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
        </dl>

        {canView && (
          <div className="mt-5 grid gap-4 rounded-2xl bg-mint/60 p-4 text-sm sm:grid-cols-2">
            <div>
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Livraison</h3>
              <p>{order.fullName}<br />{order.addressStreet}<br />{order.addressCity} {order.addressPostal ?? ""}<br />{order.phone}</p>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Paiement</h3>
              <p>Paiement à la livraison (espèces)</p>
            </div>
          </div>
        )}

        {!canView && (
          <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-center text-xs text-slate-400">
            Connectez-vous au compte ayant passé cette commande, ou ouvrez le lien récapitulatif reçu par email pour voir les détails de livraison.
          </p>
        )}
      </div>

      <div className="mt-8 text-center">
        <Link href="/" className="btn-shine btn-3d inline-block rounded-full bg-gradient-to-r from-para-500 to-para-700 px-8 py-3 font-semibold text-white shadow-lift">
          Continuer mes achats
        </Link>
      </div>
    </div>
  );
}
