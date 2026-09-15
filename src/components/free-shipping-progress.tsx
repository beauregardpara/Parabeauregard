"use client";

import { FREE_SHIPPING_THRESHOLD_DH } from "@/lib/constants";
import { formatPrice } from "@/lib/format";

export function FreeShippingProgress({ subtotal }: { subtotal: number }) {
  const threshold = FREE_SHIPPING_THRESHOLD_DH;
  const remaining = Math.max(0, threshold - subtotal);
  const pct = Math.min(100, (subtotal / threshold) * 100);

  return (
    <div className="rounded-2xl bg-white/80 p-3 shadow-sm">
      <p className="text-center text-xs font-semibold">
        {remaining > 0 ? (
          <>
            🚚 Plus que <span className="font-extrabold text-coral-600">{formatPrice(remaining)}</span> pour la{" "}
            <span className="font-extrabold">livraison gratuite</span> !
          </>
        ) : (
          <span className="font-extrabold text-emerald-600">🎉 Livraison gratuite débloquée !</span>
        )}
      </p>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-para-100"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progression vers la livraison gratuite"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-para-400 to-para-600 transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}