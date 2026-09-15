import { db } from "@/lib/db";

// Healthcheck sans secrets : ne renvoie que des compteurs et des booléens de config.
function sanitizedConfig(): Record<string, unknown> {
  const kind =
    process.env.RESEND_API_KEY && (process.env.RESEND_FROM || process.env.MAIL_FROM || process.env.EMAIL_FROM)
      ? "resend"
      : process.env.SMTP_HOST && process.env.SMTP_PORT
      ? "smtp"
      : process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN
        ? "mailgun"
        : process.env.SENDGRID_API_KEY
          ? "sendgrid"
          : "none";
  return {
    anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    firecrawlConfigured: Boolean(process.env.FIRECRAWL_API_KEY),
    emailConfigured: kind !== "none",
    emailKind: kind,
    trustedProxy: process.env.TRUSTED_PROXY === "true",
    sessionSecretChanged: process.env.SESSION_SECRET !== "remplacez-par-un-secret-aleatoire-en-prod",
  };
}

const VERSION = process.env.APP_VERSION ?? process.env.npm_package_version ?? "dev";

export async function GET() {
  let database = "ok";
  let dbLatencyMs = 0;
  try {
    const t0 = Date.now();
    await db.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
  } catch {
    database = "error";
  }

  // Les compteurs sont optionnels : si la fenêtre dépasse 3 s, on répond
  // quand même (la santé ne doit pas dépendre d'une requête lourde).
  let counts: Record<string, number> = {};
  if (database === "ok") {
    const t0 = Date.now();
    try {
      const [products, orders, customers, pendingReviews, openIssues, scrapeRuns] = await Promise.race([
        Promise.all([
          db.product.count({ where: { status: "PUBLISHED" } }),
          db.order.count(),
          db.customer.count(),
          db.review.count({ where: { status: "PENDING" } }),
          db.dataQualityIssue.count({ where: { status: "OPEN" } }),
          db.scrapeRun.count(),
        ]),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("COUNTS_TIMEOUT")), 3000)),
      ]);
      counts = { products, orders, customers, pendingReviews, openIssues, scrapeRuns };
    } catch {
      /* compteurs indisponibles — la santé reste "ok" tant que la DB répond */
    }
    dbLatencyMs = Math.max(dbLatencyMs, Date.now() - t0);
  }

  return Response.json(
    {
      ok: database === "ok",
      status: database === "ok" ? "ok" : "error",
      version: VERSION,
      service: "para-beauregard-storefront",
      uptimeSeconds: Math.floor(process.uptime()),
      database,
      dbLatencyMs,
      counts,
      config: sanitizedConfig(),
      timestamp: new Date().toISOString(),
    },
    {
      status: database === "ok" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
