"use client";

import { ExternalLink, Globe2, ShieldCheck } from "lucide-react";
import type { ReputationSnapshot } from "@/lib/reputation/types";

const confidenceLabels = { LOW: "Faible", MEDIUM: "Moyenne", HIGH: "Élevée" } as const;

export function ReputationSection({ reputation }: { reputation: ReputationSnapshot | null }) {
  if (!reputation || (reputation.status !== "READY" && reputation.status !== "STALE") || reputation.sources.length === 0) return null;

  const stale = reputation.status === "STALE";
  return (
    <section aria-labelledby="reputation-title" className="rounded-3xl border border-para-100 bg-white p-7 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Globe2 className="text-para-700" size={22} aria-hidden />
          <div>
            <h2 id="reputation-title" className="font-display text-xl font-bold text-para-900">Ce qu&apos;en dit le web</h2>
            <p className="text-xs text-slate-500">Réputation web observée</p>
          </div>
        </div>
        <span className="rounded-full bg-para-50 px-3 py-1 text-sm font-bold text-para-800">{reputation.label ?? "Peu documentée"}</span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" aria-label={`${reputation.positivePercent}% positif, ${reputation.neutralPercent}% neutre, ${reputation.negativePercent}% négatif`}>
            <span className="bg-emerald-500" style={{ width: `${reputation.positivePercent}%` }} />
            <span className="bg-slate-300" style={{ width: `${reputation.neutralPercent}%` }} />
            <span className="bg-coral-500" style={{ width: `${reputation.negativePercent}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
            <span><b className="text-emerald-700">{reputation.positivePercent}%</b> positif</span>
            <span><b>{reputation.neutralPercent}%</b> neutre</span>
            <span><b className="text-coral-700">{reputation.negativePercent}%</b> négatif</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600"><ShieldCheck size={16} className="text-para-600" aria-hidden /> Confiance {reputation.confidence ? confidenceLabels[reputation.confidence] : "non établie"}</div>
      </div>

      {reputation.summary && <p className="mt-5 text-sm leading-relaxed text-slate-600">{reputation.summary}</p>}

      {(reputation.positives.length > 0 || reputation.negatives.length > 0) && (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {reputation.positives.length > 0 && <HighlightList title="Points appréciés" items={reputation.positives} positive />}
          {reputation.negatives.length > 0 && <HighlightList title="Points à surveiller" items={reputation.negatives} />}
        </div>
      )}

      <details className="mt-6 rounded-2xl border border-para-100 bg-para-50/40 px-4 py-3">
        <summary className="cursor-pointer list-none text-sm font-bold text-para-800">Voir les sources ({reputation.totalSources})</summary>
        <ul className="mt-4 space-y-3">
          {reputation.sources.map((source) => (
            <li key={source.url} className="rounded-xl bg-white p-3 text-sm ring-1 ring-para-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-para-900">{source.title}</span>
                <span className="text-xs text-slate-500">{source.domain}</span>
              </div>
              {source.excerpt && <p className="mt-1 text-xs leading-relaxed text-slate-600">{source.excerpt}</p>}
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-para-700 hover:underline">Consulter la source <ExternalLink size={12} aria-hidden /></a>
            </li>
          ))}
        </ul>
      </details>
      <p className="mt-4 text-[11px] leading-relaxed text-slate-500">Cette synthèse est générée à partir de sources publiques disponibles sur le web et peut contenir des opinions subjectives.{stale ? " La dernière analyse est à actualiser." : ""}</p>
    </section>
  );
}

function HighlightList({ title, items, positive = false }: { title: string; items: string[]; positive?: boolean }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-para-900">{title}</h3>
      <ul className="mt-2 space-y-2 text-xs leading-relaxed text-slate-600">
        {items.map((item) => <li key={item}><span className={positive ? "mr-2 text-emerald-600" : "mr-2 text-coral-600"} aria-hidden>{positive ? "✓" : "•"}</span>{item}</li>)}
      </ul>
    </div>
  );
}
