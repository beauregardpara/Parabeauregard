"use client";

import Link from "next/link";
import ProductImage from "@/components/product-image";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";
import { FreeShippingProgress } from "@/components/free-shipping-progress";
import { FREE_SHIPPING_THRESHOLD_DH, SHIPPING_FLAT_DH } from "@/lib/constants";
import { ShoppingBag } from "lucide-react";

export function CartClient() {
  const cart = useCart();
  const threshold = FREE_SHIPPING_THRESHOLD_DH;
  const remaining = Math.max(0, threshold - cart.subtotal);

  if (!cart.items.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center lg:py-14">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-mint text-para-700 shadow-sm ring-1 ring-para-100" aria-hidden><ShoppingBag size={38} strokeWidth={1.5} /></span>
        <h1 className="mt-4 font-display text-2xl font-bold">Votre panier est vide</h1>
        <p className="mt-2 text-slate-500">Découvrez nos best-sellers et promotions du moment.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="btn-shine btn-3d rounded-full bg-gradient-to-r from-para-500 to-para-700 px-7 py-3 font-semibold text-white">Boutique</Link>
          <Link href="/promotions" className="btn-3d rounded-full border border-para-300 px-7 py-3 font-semibold text-para-800">Promotions</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-8 font-display text-3xl font-extrabold text-para-950">Mon panier ({cart.count})</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <ul className="divide-y divide-para-50 rounded-3xl border border-para-100 bg-white shadow-sm">
          {cart.items.map((i) => (
            <li key={i.productId} className="flex gap-4 p-4 sm:p-5">
              <Link href={`/produits/${i.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-para-100 bg-mint">
                <ProductImage src={i.imageUrl} alt={i.name} fill fallbackSeed={i.name} sizes="96px" className="object-cover" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link href={`/produits/${i.slug}`} className="truncate font-semibold hover:text-para-700">{i.name}</Link>
                <span className="text-sm font-bold text-para-700">{formatPrice(i.price)}</span>
                <div className="mt-auto flex items-center gap-2 pt-2">
                  <button onClick={() => cart.setQty(i.productId, i.qty - 1)} aria-label="Diminuer la quantité"
                    className="btn-3d h-8 w-8 rounded-full border border-para-200 font-bold text-para-700 hover:bg-mint">−</button>
                  <span className="w-9 text-center text-sm font-bold">{i.qty}</span>
                  <button onClick={() => cart.setQty(i.productId, i.qty + 1)} aria-label="Augmenter la quantité"
                    className="btn-3d h-8 w-8 rounded-full border border-para-200 font-bold text-para-700 hover:bg-mint">+</button>
                  <button onClick={() => cart.remove(i.productId)} className="ml-auto text-xs text-slate-500 transition hover:text-red-500">
                    Supprimer
                  </button>
                </div>
              </div>
              <strong className="hidden self-center text-para-900 sm:block">{formatPrice(i.price * i.qty)}</strong>
            </li>
          ))}
        </ul>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-3xl border border-para-100 bg-gradient-to-b from-mint to-white p-6 shadow-soft">
            <h2 className="font-display text-lg font-bold text-para-900">Résumé</h2>
            <FreeShippingProgress subtotal={cart.subtotal} />
            <dl className="mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Sous-total</dt><dd>{formatPrice(cart.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Livraison</dt><dd>{remaining <= 0 ? "Gratuite 🎉" : formatPrice(SHIPPING_FLAT_DH)}</dd></div>
            </dl>
            <Link href="/commander"
              className="btn-shine btn-3d mt-5 block rounded-full bg-gradient-to-r from-para-500 to-para-700 py-3.5 text-center font-bold text-white shadow-lift">
              Commander →
            </Link>
            <p className="mt-3 text-center text-[11px] text-slate-500">Paiement à la livraison · Livraison gratuite dès 500 DH · Retours sous 7 jours</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
