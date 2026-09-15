"use client";

import { useState, useTransition } from "react";
import { createStockAlert, type CreateStockAlertResult } from "@/lib/actions/alerts";

export function StockAlertForm({
  productId,
  productName,
  inStock,
}: {
  productId: number;
  productName: string;
  inStock: boolean;
}) {
  const [result, setResult] = useState<CreateStockAlertResult | null>(null);
  const [pending, startTransition] = useTransition();

  if (inStock) return null;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("productId", String(productId));
    startTransition(async () => {
      const res = await createStockAlert(fd);
      setResult(res);
      if (res.ok) form.reset();
    });
  }

  return (
    <div className="mt-7 rounded-2xl border border-para-100 bg-mint/40 p-4 shadow-sm">
      <p className="text-sm font-semibold text-para-800">
        🔔 « {productName} » est momentanément indisponible. Recevez une alerte dès son retour
        en stock.
      </p>
      <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          required
          type="email"
          name="email"
          placeholder="Votre adresse email"
          aria-label="Votre adresse email"
          autoComplete="email"
          className="w-full flex-1 rounded-xl border border-para-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-para-400"
        />
        <button
          type="submit"
          disabled={pending}
          className="btn-shine btn-3d rounded-full bg-gradient-to-r from-para-500 to-para-700 px-6 py-2.5 text-sm font-semibold text-white shadow-lift disabled:opacity-60"
        >
          {pending ? "Envoi…" : "M'alerter"}
        </button>
      </form>
      {result && !result.ok && (
        <p role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
          {result.error}
        </p>
      )}
      {result && result.ok && (
        <p role="status" className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          ✓ Nous vous préviendrons dès le retour en stock de « {productName} ».
        </p>
      )}
    </div>
  );
}