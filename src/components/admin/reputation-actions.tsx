"use client";

import { useState } from "react";

export function ReputationActions({ productId, hasAnalysis }: { productId: number; hasAnalysis: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function analyze() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/reputation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId }) });
      const payload = await response.json() as { error?: string; totalSources?: number };
      setMessage(response.ok ? `${payload.totalSources ?? 0} source(s)` : payload.error ?? "Échec");
    } catch { setMessage("Erreur réseau"); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/reputation", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId }) });
      setMessage(response.ok ? "Supprimée" : "Échec");
    } catch { setMessage("Erreur réseau"); } finally { setBusy(false); }
  }

  return <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={analyze} disabled={busy} className="rounded-lg bg-para-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">{busy ? "Analyse…" : hasAnalysis ? "Réanalyser" : "Analyser"}</button>{hasAnalysis && <button type="button" onClick={remove} disabled={busy} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-50">Supprimer</button>}{message && <span className="text-[11px] text-slate-500" role="status">{message}</span>}</div>;
}
