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
export function getClientIp(request: Request): string {
  if (process.env.TRUSTED_PROXY === "true") {
    const xff = request.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
  }
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
    if (process.env.TRUSTED_PROXY === "true") {
      const xff = h.get("x-forwarded-for");
      if (xff) return xff.split(",")[0].trim();
      const realIp = h.get("x-real-ip");
      if (realIp) return realIp.trim();
    }
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
  checkout: { maxRequests: 5, windowSeconds: 300, keyPrefix: "checkout" },
  contact: { maxRequests: 3, windowSeconds: 300, keyPrefix: "contact" },
  reputation: { maxRequests: 10, windowSeconds: 3600, keyPrefix: "reputation" },
} as const;
