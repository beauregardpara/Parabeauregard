"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import ProductImage from "@/components/product-image";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";
import { createOrder, validateCoupon, getCheckoutSettings } from "@/lib/actions/order";
import {
  SHIPPING_FLAT_DH,
  FREE_SHIPPING_THRESHOLD_DH,
  DELIVERY_CASABLANCA_H,
  DELIVERY_OTHER_H,
} from "@/lib/constants";

type CityFee = { city: string; fee: number };

function normCity(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function CheckoutPage() {
  const cart = useCart();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [discount, setDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [shippingFlat, setShippingFlat] = useState<number | null>(null);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | null>(null);
  const [loyaltyPointsPerDhs, setLoyaltyPointsPerDhs] = useState<number | null>(null);
  const [deliveryCities, setDeliveryCities] = useState<CityFee[]>([]);
  const [city, setCity] = useState("");

  useEffect(() => {
    getCheckoutSettings().then((s) => {
      setShippingFlat(s.shippingFlat);
      setFreeShippingThreshold(s.freeShippingThreshold);
      setLoyaltyPointsPerDhs(s.loyaltyPointsPerDhs);
      setDeliveryCities(s.deliveryCities);
    });
  }, []);

  const threshold = freeShippingThreshold ?? FREE_SHIPPING_THRESHOLD_DH;
  // Frais de livraison : ville reconnue → tarif de la ville, sinon tarif standard.
  const cityFee = deliveryCities.find((c) => normCity(c.city) === normCity(city))?.fee;
  const effectiveShipping =
    cart.subtotal >= threshold ? 0 : cityFee ?? shippingFlat ?? SHIPPING_FLAT_DH;
  const shippingDisplay = effectiveShipping;
  const totalDisplay = Math.max(0, cart.subtotal - discount) + shippingDisplay;
  const pointsPerDhs = loyaltyPointsPerDhs ?? 1;
  const pointsEarned = Math.floor(Math.max(0, cart.subtotal - discount) * pointsPerDhs);

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    const res = await validateCoupon(couponInput, cart.subtotal);
    if (res.ok) {
      setDiscount(res.discount);
      setAppliedCode(res.code);
      setCouponMsg({ ok: true, text: `Code ${res.code} appliqué : -${formatPrice(res.discount)}` });
    } else {
      setDiscount(0);
      setAppliedCode(null);
      setCouponMsg({ ok: false, text: res.error });
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createOrder({
        fullName: String(fd.get("fullName") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        email: String(fd.get("email") ?? ""),
        street: String(fd.get("street") ?? ""),
        city: String(fd.get("city") ?? ""),
        postalCode: String(fd.get("postalCode") ?? ""),
        // Seul mode de paiement proposé à ce jour ; le schéma serveur l'exige.
        paymentMethod: "COD",
        notes: String(fd.get("notes") ?? ""),
        couponCode: appliedCode ?? undefined,
        items: cart.items.map((i) => ({ productId: i.productId, qty: i.qty })),
      });
      if (result.ok) {
        cart.clear();
        router.push(`/commande/${result.reference}?token=${encodeURIComponent(result.confirmationToken)}`);
      } else {
        setError(result.error);
      }
    });
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto grid max-w-xl place-items-center px-4 py-28 text-center">
        <span className="text-6xl" aria-hidden>🛒</span>
        <h1 className="mt-4 font-display text-2xl font-bold">Votre panier est vide</h1>
        <p className="mt-2 text-slate-500">Parcourez nos rayons pour trouver votre bonheur.</p>
        <Link href="/" className="btn-shine btn-3d mt-6 rounded-full bg-gradient-to-r from-para-500 to-para-700 px-7 py-3 font-semibold text-white">
          Retour à la boutique
        </Link>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-xl border border-para-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-para-400 focus:shadow-sm";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-8 font-display text-3xl font-extrabold text-para-950">Finaliser ma commande</h1>

      <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          {/* Coordonnées */}
          <section className="rounded-3xl border border-para-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-para-900">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-para-500 to-para-700 text-sm text-white">1</span>
              Vos coordonnées
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">Nom complet *</span>
                <input name="fullName" required placeholder="Ex. Salma Benali" className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">Téléphone *</span>
                <input name="phone" required type="tel" placeholder="06 XX XX XX XX" className={inputCls} />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-bold text-slate-500">Email</span>
                <input name="email" type="email" placeholder="vous@exemple.ma" className={inputCls} />
              </label>
            </div>
          </section>

          {/* Adresse */}
          <section className="rounded-3xl border border-para-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-para-900">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-para-500 to-para-700 text-sm text-white">2</span>
              Adresse de livraison
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-bold text-slate-500">Adresse (rue, quartier…) *</span>
                <input name="street" required placeholder="12 rue des Orangers, Résidence X, Apt 3" className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">Ville *</span>
                <input name="city" required placeholder="Casablanca" value={city}
                  onChange={(e) => setCity(e.target.value)} list="delivery-cities" className={inputCls} />
                <datalist id="delivery-cities">
                  {deliveryCities.map((c) => (
                    <option key={c.city} value={c.city} />
                  ))}
                </datalist>
                {cityFee != null && (
                  <span className="mt-1 block text-[11px] font-semibold text-para-600">
                    Tarif {deliveryCities.find((c) => normCity(c.city) === normCity(city))?.city} : {formatPrice(cityFee)}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">Code postal</span>
                <input name="postalCode" inputMode="numeric" placeholder="20000" className={inputCls} />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-bold text-slate-500">Instructions de livraison (optionnel)</span>
                <textarea name="notes" rows={2} placeholder="Appelez avant de livrer…" className={inputCls} />
              </label>
            </div>
          </section>

          {/* Paiement */}
          <section className="rounded-3xl border border-para-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-para-900">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-para-500 to-para-700 text-sm text-white">3</span>
              Paiement à la livraison
            </h2>
            <div className="flex items-center gap-4 rounded-2xl bg-mint/60 p-4">
              <span className="text-3xl">💵</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Paiement en espèces à la réception de votre colis.</p>
                <p className="text-xs text-slate-500">Livraison {DELIVERY_CASABLANCA_H} à Casablanca, {DELIVERY_OTHER_H} ailleurs · offerte dès {threshold} DH d'achat.</p>
              </div>
            </div>
          </section>
        </div>

        {/* Récapitulatif */}
        <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-3xl border border-para-100 bg-white p-6 shadow-soft">
            <h2 className="mb-4 font-display text-lg font-bold text-para-900">Récapitulatif ({cart.count})</h2>
            <ul className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {cart.items.map((i) => (
                <li key={i.productId} className="flex items-center gap-3">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-para-100 bg-mint">
                    <ProductImage src={i.imageUrl} alt="" fill fallbackSeed={i.name} sizes="56px" className="object-cover" />
                    <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-para-700 text-[10px] font-bold text-white">{i.qty}</span>
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{i.name}</span>
                  <strong className="text-sm text-para-700">{formatPrice(i.price * i.qty)}</strong>
                </li>
              ))}
            </ul>

            <div className="mt-4 border-t border-dashed border-para-100 pt-4">
              <div className="flex gap-2">
                <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Code promo" aria-label="Code promo"
                  className="w-full rounded-xl border border-para-200 px-3 py-2 text-sm uppercase outline-none focus:border-para-400" />
                <button type="button" onClick={applyCoupon}
                  className="btn-3d shrink-0 rounded-xl bg-para-800 px-4 py-2 text-sm font-semibold text-white hover:bg-para-900">
                  Appliquer
                </button>
              </div>
              {couponMsg && (
                <p className={`mt-2 text-xs font-semibold ${couponMsg.ok ? "text-emerald-600" : "text-red-500"}`}>{couponMsg.text}</p>
              )}
            </div>

            <dl className="mt-4 space-y-1.5 border-t border-dashed border-para-100 pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Sous-total</dt><dd>{formatPrice(cart.subtotal)}</dd></div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600"><dt>Réduction</dt><dd>-{formatPrice(discount)}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-slate-500">Livraison</dt><dd>{shippingDisplay === 0 ? "Gratuite 🎉" : formatPrice(shippingDisplay)}</dd></div>
              <div className="mt-2 flex items-start justify-between border-t border-para-100 pt-2.5 text-sm text-emerald-700">
                <dt className="flex items-center gap-1.5 font-semibold">
                  <span aria-hidden>⭐</span> Points fidélité à gagner
                </dt>
                <dd className="font-bold">{pointsEarned} pts</dd>
              </div>
              <div className="mt-2 flex justify-between border-t border-para-100 pt-2.5 text-base font-extrabold text-para-900">
                <dt>Total</dt><dd>{formatPrice(totalDisplay)}</dd>
              </div>
            </dl>

            {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">{error}</p>}

            <button type="submit" disabled={pending}
              className="btn-shine btn-3d mt-4 w-full rounded-full bg-gradient-to-r from-para-500 to-para-700 py-3.5 font-bold text-white shadow-lift disabled:opacity-60">
              {pending ? "Traitement…" : `Confirmer la commande — ${formatPrice(totalDisplay)}`}
            </button>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-400">
              En validant, vous acceptez nos <Link href="/cgv" className="underline">CGV</Link>.
              Vos données sont protégées conformément à la loi 09-08.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
