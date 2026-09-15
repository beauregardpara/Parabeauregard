"use client";

import { useState } from "react";
import { createReturnRequest } from "@/lib/actions/returns";

export function ReturnRequestForm() {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setStatus(null);
    const formData = new FormData(e.currentTarget);
    const result = await createReturnRequest(formData);
    setPending(false);
    if (result.ok) {
      setStatus({ kind: "ok", message: "Votre demande a été enregistrée. Nous vous répondrons par email sous 48 h ouvrées." });
      (e.target as HTMLFormElement).reset();
    } else {
      setStatus({ kind: "error", message: result.error ?? "Une erreur est survenue." });
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <div>
        <label htmlFor="retour-ref" className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Référence de la commande</label>
        <input
          id="retour-ref"
          name="reference"
          required
          placeholder="PB-2026-…"
          autoCapitalize="characters"
          className="w-full rounded-2xl border border-para-100 bg-white px-4 py-3 text-sm outline-none ring-para-200 transition focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="retour-email" className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Email de la commande</label>
        <input id="retour-email" name="email" type="email" required placeholder="vous@exemple.ma"
          className="w-full rounded-2xl border border-para-100 bg-white px-4 py-3 text-sm outline-none ring-para-200 transition focus:ring-2" />
      </div>
      <div>
        <label htmlFor="retour-reason" className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Raison du retour</label>
        <select id="retour-reason" name="reason" required
          className="w-full rounded-2xl border border-para-100 bg-white px-4 py-3 text-sm outline-none ring-para-200 transition focus:ring-2">
          <option value="">Choisir…</option>
          <option value="Produit endommagé">Produit endommagé</option>
          <option value="Erreur de référence">Erreur de référence</option>
          <option value="Produit non conforme">Produit non conforme à la description</option>
          <option value="Article manquant">Article manquant</option>
          <option value="Autre">Autre</option>
        </select>
      </div>
      <div>
        <label htmlFor="retour-details" className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Précisions (optionnel)</label>
        <textarea id="retour-details" name="details" rows={3} maxLength={2000} placeholder="Décrivez le problème constaté…"
          className="w-full rounded-2xl border border-para-100 bg-white px-4 py-3 text-sm outline-none ring-para-200 transition focus:ring-2" />
      </div>
      {status && (
        <p role="alert" className={`rounded-xl px-3 py-2 text-xs font-semibold ${status.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
          {status.message}
        </p>
      )}
      <button type="submit" disabled={pending}
        className="btn-shine w-full rounded-full bg-gradient-to-r from-para-500 to-para-700 px-6 py-3 font-semibold text-white shadow-lift transition hover:brightness-110 disabled:opacity-60">
        {pending ? "Envoi…" : "Envoyer ma demande"}
      </button>
    </form>
  );
}