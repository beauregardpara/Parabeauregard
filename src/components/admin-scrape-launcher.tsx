"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ScrapeLauncher({ sources }: { sources: string[] }) {
  const router = useRouter();
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function launch(source: string) {
    setRunning(source);
    setResult(null);
    try {
      const res = await fetch("/api/admin/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(
          `✓ ${source} terminé : +${data.addedCount} ajoutés · ~${data.updatedCount} modifiés · ${data.errorCount} erreurs (${data.status})`
        );
        startTransition(() => router.refresh());
      } else {
        setResult(`✖ ${source} : ${data.error}`);
      }
    } catch {
      setResult(`✖ Erreur réseau pendant le scraping de ${source}.`);
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {sources.map((s) => (
          <button
            key={s}
            onClick={() => launch(s)}
            disabled={running !== null}
            className="btn-shine btn-3d rounded-xl bg-gradient-to-r from-para-500 to-para-700 px-5 py-2.5 text-sm font-bold text-white shadow disabled:opacity-60"
          >
            {running === s ? "⏳ Scraping en cours…" : `▶ Lancer ${s}`}
          </button>
        ))}
      </div>
      {result && (
        <p className={`rounded-xl px-4 py-2.5 text-xs font-semibold ${result.startsWith("✓") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
          {result}
        </p>
      )}
    </div>
  );
}
