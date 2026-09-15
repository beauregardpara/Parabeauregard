const errors = [];
const warnings = [];

const databaseUrl = process.env.DATABASE_URL ?? "";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
const sessionSecret = process.env.SESSION_SECRET ?? "";

if (process.env.NODE_ENV !== "production") errors.push("NODE_ENV must be production.");
if (!/^postgres(ql)?:\/\//i.test(databaseUrl)) errors.push("DATABASE_URL must point to PostgreSQL for production.");
if (!/^https:\/\//i.test(siteUrl)) errors.push("NEXT_PUBLIC_SITE_URL must be an HTTPS URL.");
if (sessionSecret.length < 32 || sessionSecret === "remplacez-par-un-secret-aleatoire-en-prod") {
  errors.push("SESSION_SECRET must be a unique random value of at least 32 characters.");
}
if (!process.env.FIRECRAWL_API_KEY) warnings.push("FIRECRAWL_API_KEY is not configured; reputation analysis is unavailable.");
if (!process.env.RESEND_API_KEY && !process.env.SMTP_HOST && !process.env.MAILGUN_API_KEY && !process.env.SENDGRID_API_KEY) {
  warnings.push("No transactional email provider is configured.");
}

const report = {
  productionEnvironment: errors.length === 0 ? "valid" : "invalid",
  database: /^postgres(ql)?:\/\//i.test(databaseUrl) ? "postgresql" : "not-postgresql",
  siteUrl: siteUrl ? new URL(siteUrl).origin : "missing",
  firecrawl: Boolean(process.env.FIRECRAWL_API_KEY),
  transactionalEmail: Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST || process.env.MAILGUN_API_KEY || process.env.SENDGRID_API_KEY),
  errors,
  warnings,
};
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exit(1);
