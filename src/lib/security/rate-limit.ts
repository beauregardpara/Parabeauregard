/**
 * Rate limiter in-memory basé sur une fenêtre glissante.
 * Pour la production, remplacer par upstash/ratelimit + Redis.
 */

type RateLimitEntry = { count: number; resetAt: number };

const store = new Map<string, RateLimitEntry>();

// Nettoyage périodique des entrées expirées (toutes les 60s)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, 60_000);
}

export type RateLimitConfig = {
  /** Nombre max de requêtes par fenêtre */
  maxRequests: number;
  /** Durée de la fenêtre en secondes */
  windowSeconds: number;
  /** Clé personnalisée (défaut : IP) */
  keyPrefix?: string;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Vérifie et incrémente le compteur pour une clé donnée.
 * Retourne si la requête est autorisée.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${config.keyPrefix ?? "rl"}:${identifier}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    // Nouvelle fenêtre
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + windowMs };
  }

  if (entry.count >= config.maxRequests) {
    // Limite atteinte
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  // Incrémenter
  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * Extrait l'IP du client depuis les headers ou la request.
 * Des headers tiers ne sont pris en compte que si TRUSTED_PROXY est défini,
 * pour éviter le spoofing de X-Forwarded-For.
 */
/**
 * Sur Vercel, le proxy de la plateforme réécrit lui-même les en-têtes d'IP :
 * ils sont fiables sans configuration. Ailleurs, TRUSTED_PROXY=true est requis.
 */
function proxyHeadersTrusted(): boolean {
  return process.env.TRUSTED_PROXY === "true" || process.env.VERCEL === "1";
}

/** IP client depuis des en-têtes émis par un proxy de confiance. */
export function ipFromTrustedHeaders(get: (name: string) => string | null | undefined): string | null {
  if (!proxyHeadersTrusted()) return null;
  const candidates = [
    process.env.VERCEL === "1" ? get("x-vercel-forwarded-for") : null,
    get("x-forwarded-for"),
    get("x-real-ip"),
  ];
  for (const value of candidates) {
    const ip = value?.split(",")[0]?.trim();
    if (ip) return ip;
  }
  return null;
}

export function getClientIp(request: Request): string {
  const trusted = ipFromTrustedHeaders((name) => request.headers.get(name));
  if (trusted) return trusted;
  // Sinon, essayer l'IP directe (présente dans certains runtimes)
  try {
    const ip = (request as { ip?: string }).ip;
    if (ip) return ip;
  } catch {}
  return "unknown";
}

/**
 * Récupère l'IP du client depuis next/headers() dans une Server Action.
 * Sans proxy de confiance, on retombe sur une clé globale (inconvénient
 * mineur en dev, remplacé par un vrai proxy en production).
 */
export async function getServerActionIp(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const trusted = ipFromTrustedHeaders((name) => h.get(name));
    if (trusted) return trusted;
    // Sans proxy de confiance, on refuse d'interpréter X-Forwarded-For
    // (risque de spoofing) : on retombe sur une clé globale.
    return "server-action";
  } catch {
    return "server-action";
  }
}

// ── Configurations prédéfinies ──────────────────────────────────

export const RATE_LIMITS = {
  chat: { maxRequests: 10, windowSeconds: 60, keyPrefix: "chat" },
  search: { maxRequests: 30, windowSeconds: 60, keyPrefix: "search" },
  login: { maxRequests: 5, windowSeconds: 300, keyPrefix: "login" },
  register: { maxRequests: 3, windowSeconds: 300, keyPrefix: "register" },
  passwordReset: { maxRequests: 5, windowSeconds: 900, keyPrefix: "password-reset" },
  checkout: { maxRequests: 5, windowSeconds: 300, keyPrefix: "checkout" },
  contact: { maxRequests: 3, windowSeconds: 300, keyPrefix: "contact" },
  reputation: { maxRequests: 10, windowSeconds: 3600, keyPrefix: "reputation" },
} as const;
