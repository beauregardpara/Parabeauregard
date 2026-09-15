/**
 * Journalisation structurée (JSON-lines sur stdout) avec :
 *  - niveau configurable (LOG_LEVEL : debug|info|warn|error),
 *  - module + événement stables pour l'observabilité,
 *  - requestId pour corréler une requête de bout en bout,
 *  - durationMs pour le profilage,
 *  - redaction automatique des secrets (mots-clés password/token/secret/apiKey…).
 *
 * Les lignes sont émises en `console.log` pour être capturées par Docker,
 * PM2, Railway/Render/… et indexées par n'importe quel collecteur JSON.
 * Un indicateur `jsanitized` marque la ligne pour un PII-scan aval.
 */
import { randomUUID } from "crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LoggerModule =
  | "http"
  | "database"
  | "auth"
  | "orders"
  | "scraper"
  | "reputation"
  | "ai"
  | "email"
  | "admin"
  | "security"
  | "app";

export type LogData = Record<string, unknown>;

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const CURRENT_LEVEL: LogLevel = (["debug", "info", "warn", "error"] as LogLevel[]).includes(
  (process.env.LOG_LEVEL ?? "info").toLowerCase() as LogLevel
)
  ? ((process.env.LOG_LEVEL ?? "info").toLowerCase() as LogLevel)
  : "info";

const REDACT_KEY_PATTERN = /(password|passwd|pwd|token|secret|api[-_]?key|authorization|cookie|session|access_key|private_key|datasource)/i;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((v) => redact(v));
  if (value && typeof value === "object") {
    const out: LogData = {};
    for (const [k, v] of Object.entries(value as LogData)) {
      if (REDACT_KEY_PATTERN.test(k)) out[k] = "***REDACTED***";
      else out[k] = redact(v) as LogData[string];
    }
    return out;
  }
  return value;
}

export type LogParams = {
  level: LogLevel;
  module: LoggerModule;
  event: string;
  message?: string;
  errorCode?: string;
  durationMs?: number;
  requestId?: string;
  data?: LogData;
};

export function newRequestId(): string {
  return randomUUID();
}

/** Expose le niveau actif (utile pour des traces conditionnelles de debug). */
export function isDebugEnabled(): boolean {
  return LEVEL_RANK[CURRENT_LEVEL] <= LEVEL_RANK.debug;
}

export function log(params: LogParams): void {
  if (LEVEL_RANK[params.level] < LEVEL_RANK[CURRENT_LEVEL]) return;

  const entry: LogData = {
    ts: new Date().toISOString(),
    level: params.level,
    module: params.module,
    event: params.event,
    ...(params.message ? { message: params.message } : {}),
    ...(params.errorCode ? { errorCode: params.errorCode } : {}),
    ...(params.durationMs !== undefined ? { durationMs: params.durationMs } : {}),
    ...(params.requestId ? { requestId: params.requestId } : {}),
  };

  const payload = params.data ? (redact(params.data) as LogData) : {};
  const line = JSON.stringify({ ...entry, ...payload, jsanitized: true });
  // console.log (stdout) : capturable par le collecteur de logs conteneurisé.
  console.log(line);
}

export const logger = {
  debug(module: LoggerModule, event: string, params?: Omit<LogParams, "level" | "module" | "event">) {
    log({ level: "debug", module, event, ...params });
  },
  info(module: LoggerModule, event: string, params?: Omit<LogParams, "level" | "module" | "event">) {
    log({ level: "info", module, event, ...params });
  },
  warn(module: LoggerModule, event: string, params?: Omit<LogParams, "level" | "module" | "event">) {
    log({ level: "warn", module, event, ...params });
  },
  error(module: LoggerModule, event: string, params?: Omit<LogParams, "level" | "module" | "event">) {
    log({ level: "error", module, event, ...params });
  },
};
