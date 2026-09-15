import { logger } from "./index";

/**
 * Point d'intégration Sentry PRÊT SANS DEPENDANCE : tant que SENTRY_DSN
 * n'est pas fourni, captureException/captureMessage journalisent en
 * structuré (JSON-lines) au lieu de rien — et permettent de brancher
 * @sentry/nextjs (ou toute plateforme) plus tard sans changer les call sites.
 */
const DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || "";

export const sentryEnabled = Boolean(DSN);

export function captureException(err: unknown, extra?: Record<string, unknown>): void {
  const message = err instanceof Error ? err.message : String(err ?? "inconnu");
  logger.error("app", "sentry.exception", {
    message,
    data: {
      ...extra,
      sentryEnabled,
      ...(err instanceof Error ? { name: err.name, stack: (err.stack ?? "").slice(0, 2000) } : {}),
    },
  });
  // Brancher ici quand SENTRY_DSN est défini :
  //   import * as Sentry from "@sentry/nextjs";
  //   Sentry.captureException(err);
}

export function captureMessage(message: string, extra?: Record<string, unknown>): void {
  logger.info("app", "sentry.message", { message, data: { ...extra, sentryEnabled } });
  //   Sentry.captureMessage(message);
}