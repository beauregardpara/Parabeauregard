import { db } from "@/lib/db";
import { getSetting, getSettingBool } from "@/lib/settings";
import { connectorKeys } from "@/lib/scraper/connectors";
import { formatDate } from "@/lib/format";
import { saveScraperSettings } from "@/lib/actions/admin";
import { ScrapeLauncher } from "@/components/admin-scrape-launcher";
import { PageHeader } from "@/components/admin-shell";

export default async function AdminScraperPage() {
  const [runs, frequency, autoPublish] = await Promise.all([
    db.scrapeRun.findMany({ orderBy: { startedAt: "desc" }, take: 30 }),
    getSetting("scrape_frequency_hours"),
    getSettingBool("auto_publish"),
  ]);

  return (
    <>
      <PageHeader
        title="Scraper & sources"
        subtitle="Extractions automatisées depuis les sites sources. Les nouveaux produits arrivent en validation."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-display font-bold">Lancer un scraping manuel</h2>
            <ScrapeLauncher sources={connectorKeys()} />
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
              ℹ️ Chaque exécution respecte le robots.txt du site source, applique un délai aléatoire entre
              requêtes et journalise tous les événements. Les produits inconnus arrivent en statut
              « À valider » (sauf mode automatique activé). Planification CLI :{" "}
              <code className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px]">npm run scrape:schedule</code>
            </p>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-5 py-3.5">
              <h2 className="font-display font-bold">Historique des exécutions</h2>
            </header>
            {runs.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-slate-400">Aucune exécution enregistrée.</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {runs.map((r) => (
                  <li key={r.id}>
                    <details className="group">
                      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-5 py-3 hover:bg-mint/30">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          r.status === "SUCCESS" ? "bg-emerald-50 text-emerald-700"
                          : r.status === "PARTIAL" ? "bg-amber-50 text-amber-700"
                          : r.status === "RUNNING" ? "bg-blue-50 text-blue-700"
                          : "bg-red-50 text-red-600"
                        }`}>{r.status}</span>
                        <strong className="text-sm">{r.sourceName}</strong>
                        <span className="text-xs text-slate-400">{formatDate(r.startedAt)}</span>
                        <span className="ml-auto flex gap-3 text-xs">
                          <span className="text-emerald-600">+{r.addedCount}</span>
                          <span className="text-para-600">~{r.updatedCount}</span>
                          <span className="text-slate-400">?{r.missingCount}</span>
                          <span className={r.errorCount > 0 ? "font-bold text-red-500" : "text-slate-300"}>{r.errorCount} err.</span>
                        </span>
                      </summary>
                      <pre className="max-h-72 overflow-auto whitespace-pre-wrap border-t border-slate-50 bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-100">
{r.log || "(aucun log)"}
                      </pre>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-8 xl:self-start">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-display font-bold">Configuration</h2>
            <form action={saveScraperSettings} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Fréquence (heures)</span>
                <input name="frequency" type="number" min="1" max="168" defaultValue={frequency}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-para-400" />
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="autoPublish" defaultChecked={autoPublish} className="mt-0.5 h-4 w-4 accent-para-600" />
                <span>
                  <strong>Mode automatique</strong>
                  <span className="block text-xs text-slate-500">Publier directement les nouveaux produits sans validation manuelle.</span>
                </span>
              </label>
              <button type="submit" className="btn-shine btn-3d w-full rounded-xl bg-gradient-to-r from-para-500 to-para-700 py-2.5 font-bold text-white">
                💾 Enregistrer
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 font-display font-bold">Connecteurs actifs</h2>
            <ul className="space-y-2 text-sm">
              {connectorKeys().map((k) => (
                <li key={k} className="flex items-center gap-2 rounded-xl bg-mint/60 px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  {k}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
