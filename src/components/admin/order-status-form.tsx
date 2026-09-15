"use client";

import { startTransition, useState } from "react";
import { updateOrderStatus } from "@/lib/actions/admin";

const STATUS_LABELS: Record<string, [string, string]> = {
  NEW: ["Reçue", "Statut « Reçue »"],
  PREPARING: ["En préparation", "Statut « En préparation »"],
  SHIPPED: ["Expédiée", "Statut « Expédiée »"],
  DELIVERED: ["Livrée", "Statut « Livrée »"],
  CANCELLED: ["Annulée", "Statut « Annulée »"],
};

export default function OrderStatusForm({
  orderId,
  currentStatus,
}: {
  orderId: number;
  currentStatus: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <>
      <form
        action={updateOrderStatus}
        onSubmit={(e) => {
          const status = new FormData(e.currentTarget).get("status");
          if (status === "CANCELLED" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="flex gap-2"
      >
        <input type="hidden" name="id" value={orderId} />
        <select name="status" defaultValue={currentStatus}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-para-400">
          {Object.entries(STATUS_LABELS).map(([value, [label]]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button type="submit" className="btn-3d rounded-xl bg-gradient-to-r from-para-500 to-para-700 px-4 font-bold text-white">✓</button>
      </form>

      {open && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
          <p className="mb-2 font-semibold text-red-700">
            Annuler cette commande ? Le stock et les points fidélité du client seront restitués.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setPending(true);
                const form = new FormData();
                form.set("id", String(orderId));
                form.set("status", "CANCELLED");
                startTransition(() => {
                  void updateOrderStatus(form);
                });
                setOpen(false);
              }}
              disabled={pending}
              className="btn-3d rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            >
              {pending ? "Annulation…" : "Oui, annuler"}
            </button>
            <button onClick={() => setOpen(false)} className="btn-3d rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold">
              Non, garder
            </button>
          </div>
        </div>
      )}
    </>
  );
}