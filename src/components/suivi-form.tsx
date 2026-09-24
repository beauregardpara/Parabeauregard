"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Formulaire de suivi : transfère vers /suivi-commande/<référence>?token=<jeton>. */
export function SearchRedirectForm() {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ref = reference.trim().toUpperCase();
    const t = token.trim();
    if (!ref) {
      setError("La référence est obligatoire.");
      return;
    }
    if (!/^PB-\d{4}-[0-9A-Z]{6,10}$/.test(ref)) {
      setError("La référence ne semble pas valide (ex. PB-2026-7FH3K2L1).");
      return;
    }
    if (!t) {
      setError("Le jeton de suivi est obligatoire pour consulter cette commande.");
      return;
    }
    setError(null);
    router.push(`/suivi-commande/${encodeURIComponent(ref)}?token=${encodeURIComponent(t)}`);
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <div>
        <label htmlFor="suivi-ref" className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
          Référence
        </label>
        <input
          id="suivi-ref"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="PB-2026-…"
          autoCapitalize="characters"
          className="w-full rounded-2xl border border-para-100 bg-white px-4 py-3 text-sm outline-none ring-para-200 transition focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="suivi-token" className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
          Jeton de suivi
        </label>
        <input
          id="suivi-token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Votre jeton (envoyé par email)"
          className="w-full rounded-2xl border border-para-100 bg-white px-4 py-3 text-sm outline-none ring-para-200 transition focus:ring-2"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="btn-shine w-full rounded-full bg-gradient-to-r from-para-500 to-para-700 px-6 py-3 font-semibold text-white shadow-lift transition hover:brightness-110"
      >
        Afficher le suivi
      </button>
    </form>
  );
}