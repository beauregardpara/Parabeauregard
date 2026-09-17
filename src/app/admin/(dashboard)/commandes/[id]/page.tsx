import Link from "next/link";
import { BUSINESS } from "@/config/business";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/admin-shell";
import OrderStatusForm from "@/components/admin/order-status-form";
import { FileText } from "lucide-react";
import { requireAdminPagePermission } from "@/lib/auth";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPagePermission("orders:read");
  const { id } = await params;
  const orderId = parseInt(id);
  if (!Number.isFinite(orderId)) notFound();

  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true, customer: true } });
  if (!order) notFound();

  return (
    <>
      <PageHeader
        title={`Commande ${order.reference}`}
        subtitle={`${formatDate(order.createdAt)} · Paiement à la livraison ${order.paid ? "· Payée ✓" : "· Non payée"}`}
        action={
          <div className="flex gap-2">
            <Link href="/admin/commandes" className="btn-3d rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 hover:bg-mint">← Retour</Link>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px] print:block">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:shadow-none">
          {/* Facture / bon de livraison imprimable */}
          <div className="mb-6 hidden justify-between border-b border-dashed border-slate-300 pb-6 print:flex">
            <div>
              <p className="font-display text-lg font-extrabold text-para-900">Para Beauregard</p>
              <p className="text-xs text-slate-500">{BUSINESS.locationLabel} · {BUSINESS.phoneDisplay}</p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p className="font-bold text-para-900">{order.reference}</p>
              <p>{formatDate(order.createdAt)}</p>
            </div>
          </div>

          <h2 className="mb-4 font-display font-bold">Articles ({order.items.length})</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
              <tr><th className="py-2">Produit</th><th className="py-2">P.U.</th><th className="py-2">Qté</th><th className="py-2 text-right">Total</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {order.items.map((i) => (
                <tr key={i.id}>
                  <td className="py-2.5">
                    <Link href={`/produits/${i.productSlug}`} target="_blank" className="hover:text-para-700">{i.productName}</Link>
                  </td>
                  <td className="py-2.5">{formatPrice(i.unitPrice)}</td>
                  <td className="py-2.5">× {i.quantity}</td>
                  <td className="py-2.5 text-right font-semibold">{formatPrice(i.unitPrice * i.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="mt-5 ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Sous-total</dt><dd>{formatPrice(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-emerald-600"><dt>Réduction {order.couponCode}</dt><dd>-{formatPrice(order.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-slate-500">Livraison</dt><dd>{formatPrice(order.shippingCost)}</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 font-extrabold text-para-900"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
          </dl>

          {order.notes && (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800"><FileText size={16} className="mt-0.5 shrink-0" aria-hidden />{order.notes}</p>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 font-display font-bold">Statut de la commande</h2>
            <OrderStatusForm orderId={order.id} currentStatus={order.status} />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 font-display font-bold">Client & livraison</h2>
            <p className="text-sm leading-relaxed">
              <strong>{order.fullName}</strong><br />
              {order.phone}<br />
              {order.email || "—"}
            </p>
            <hr className="my-3 border-slate-100" />
            <p className="text-sm leading-relaxed text-slate-600">
              {order.addressStreet}<br />
              {order.addressCity} {order.addressPostal ?? ""}
            </p>
            {order.customerId && (
              <Link href="/admin/clients" className="mt-3 inline-block text-xs font-bold text-para-600 hover:underline">
                Voir la fiche client →
              </Link>
            )}
          </section>

          <button onClick={() => typeof window !== "undefined" && window.print()}
            className="btn-shine btn-3d w-full rounded-xl bg-para-900 py-3 text-sm font-bold text-white shadow-lift">
            🖨 Imprimer bon de livraison / facture
          </button>
        </aside>
      </div>
    </>
  );
}
