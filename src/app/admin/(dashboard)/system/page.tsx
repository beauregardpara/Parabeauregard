import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin-shell";
import { StatusPill } from "@/components/status-pill";
import { emailProviderStatus } from "@/lib/email";

export const metadata = { title: "Système & santé — Admin", robots: { index: false } };

async function envStatus() {
  return {
    node: process.version ?? "inconnu",
    version: process.env.APP_VERSION ?? process.env.npm_package_version ?? "dev",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "(non défini)",
    database: process.env.DATABASE_URL?.startsWith("postgres") ? "PostgreSQL" : "SQLite (dev)",
    trustedProxy: process.env.TRUSTED_PROXY === "true",
    email: emailProviderStatus(),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    firecrawl: Boolean(process.env.FIRECRAWL_API_KEY),
    sessionSecretOk: process.env.SESSION_SECRET !== "remplacez-par-un-secret-aleatoire-en-prod",
  };
}

async function checkDatabase() {
  const before = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - before };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - before, error: e instanceof Error ? e.message : "inconnu" };
  }
}

export default async function AdminSystemPage() {
  const [dbCheck, env, emailLogs, pendingIssues, lastScrape, failedScrapes24h] = await Promise.all([
    checkDatabase(),
    envStatus(),
    db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    db.dataQualityIssue.count({ where: { status: "OPEN" } }),
    db.scrapeRun.findFirst({ orderBy: { startedAt: "desc" } }),
    db.scrapeRun.count({ where: { status: "FAILED", startedAt: { gte: new Date(Date.now() - 24 * 3600_000) } } }),
  ]);

  const okBadges = [
    { label: "Base de données", ok: dbCheck.ok, detail: dbCheck.ok ? `${dbCheck.latencyMs} ms` : dbCheck.error },
    { label: "Emails configurés", ok: env.email.configured, detail: `${env.email.kind} provider` },
    { label: "Assistant IA (Anthropic)", ok: env.anthropic, detail: env.anthropic ? "Clé présente" : "Non configuré (fallback local)" },
    { label: "Scraper avancé (Firecrawl)", ok: env.firecrawl, detail: env.firecrawl ? "Clé présente" : "Non configuré (scraping de base)" },
    { label: "Secret de session sécurisé", ok: env.sessionSecretOk, detail: env.sessionSecretOk ? "OK" : "Valeur par défaut — à changer en prod" },
    { label: "Trusted proxy", ok: env.trustedProxy, detail: env.trustedProxy ? "Rate-limit IP fiable" : "Limitation assumée en dev" },
    { label: "Anomalies qualité ouvertes", ok: pendingIssues === 0, detail: `${pendingIssues} ouverte(s)` },
    { label: "Scraper 24 h", ok: failedScrapes24h === 0, detail: failedScrapes24h === 0 ? "Aucune erreur" : `${failedScrapes24h} échec(s)` },
  ];

  const failedSends = emailLogs.filter((l) => l.status === "FAILED").length;

  function lastScrapeDetail(): string {
    if (!lastScrape) return "Aucun scraping enregistré";
    const date = new Date(lastScrape.startedAt).toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
    const extra = lastScrape.finishedAt
      ? ` +${lastScrape.addedCount} / ~${lastScrape.updatedCount} / ${lastScrape.errorCount} err — ${date}`
      : " — en cours…";
    return `${lastScrape.sourceName} (${lastScrape.status})${extra}`;
  }

  return (
    <>
      <PageHeader title="Système & santé" subtitle="État du service et de la configuration (aucun secret affiché)." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {okBadges.map((b) => (
          <div key={b.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-para-900">{b.label}</p>
              <StatusPill status={b.ok ? "SUCCESS" : "FAILED"} label={b.ok ? "OK" : "À vérifier"} />
            </div>
            <p className="mt-1 text-xs text-slate-500">{b.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Environnement */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-display font-bold text-para-900">Environnement</h2>
          <dl className="space-y-2 text-sm">
            <Row k="Node.js" v={env.node} />
            <Row k="Version app" v={env.version} />
            <Row k="URL publique" v={env.siteUrl} />
            <Row k="Base de données" v={env.database} />
          </dl>
        </section>

        {/* Dernier scraping */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-display font-bold text-para-900">Dernier scraping</h2>
          {lastScrape ? (
            <div className="flex items-start gap-3">
              <StatusPill
                status={lastScrape.status === "SUCCESS" ? "SUCCESS" : lastScrape.status === "PARTIAL" ? "PENDING_REVIEW" : "FAILED"}
                label={lastScrape.status}
              />
              <p className="text-sm leading-relaxed text-slate-600">{lastScrapeDetail()}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Aucun scraping enregistré. Lancez un scraping depuis l'onglet « Scraper & sources ».</p>
          )}
        </section>

        {/* Journal d'envoi email */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display font-bold text-para-900">Derniers emails</h2>
            {failedSends > 0 && (
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600">
                {failedSends} échec(s) récent(s)
              </span>
            )}
          </div>
          <p className="mb-3 text-xs text-slate-400">
            Statut : <strong>SKIPPED</strong> = aucun provider configuré (no-op silencieux), <strong>SENT</strong> = livré, <strong>FAILED</strong> = erreur d'envoi (jamais fatal).
          </p>
          {emailLogs.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun email envoyé pour le moment.</p>
          ) : (
            <ul className="divide-y divide-slate-50 text-sm">
              {emailLogs.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="min-w-0 flex-1 truncate">
                    {l.template} <span className="text-slate-400">→ {l.to}</span>
                  </span>
                  <StatusPill status={l.status === "SENT" ? "SUCCESS" : l.status === "FAILED" ? "FAILED" : "PENDING_REVIEW"} label={l.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-50 pb-2">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right font-semibold text-para-900">{v}</dd>
    </div>
  );
}