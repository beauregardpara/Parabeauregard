import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit, getClientIp, RATE_LIMITS, getServerActionIp } from "@/lib/security/rate-limit";
import { isBlockedHost } from "@/lib/scraper/http";
import { renderEmail } from "@/lib/email/templates";
import { logger } from "@/lib/logger";

/**
 * Non-régression V2.1 :
 * 1. SSRF : le garde-fou anti-hôtes internes doit rejeter les cibles sensibles.
 * 2. Rate-limit : X-Forwarded-For ignoré sans proxy de confiance (anti-spoofing).
 * 3. Emails : échappement HTML systématique (anti-XSS).
 * 4. Logger : JSON-lines + redaction des secrets + niveaux.
 */

describe("Sécurité : hôtes internes / SSRF", () => {
  it("bloque loopback et RFC1918", () => {
    expect(isBlockedHost("127.0.0.1")).toBe(true);
    expect(isBlockedHost("127.0.0.2")).toBe(true);
    expect(isBlockedHost("10.1.2.3")).toBe(true);
    expect(isBlockedHost("172.16.9.9")).toBe(true);
    expect(isBlockedHost("172.31.255.255")).toBe(true);
    expect(isBlockedHost("192.168.1.10")).toBe(true);
    expect(isBlockedHost("100.64.0.1")).toBe(true);
  });

  it("bloque APIPA / metadata cloud et IPv6 spéciales", () => {
    expect(isBlockedHost("169.254.169.254")).toBe(true);
    expect(isBlockedHost("::1")).toBe(true);
    expect(isBlockedHost("fc00::1")).toBe(true);
    expect(isBlockedHost("fe80::1")).toBe(true);
  });

  it("bloque les noms internes et autorise le web public", () => {
    expect(isBlockedHost("localhost")).toBe(true);
    expect(isBlockedHost("db.internal")).toBe(true);
    expect(isBlockedHost("postgres.local")).toBe(true);
    expect(isBlockedHost("cdn.pharma.ma")).toBe(false);
    expect(isBlockedHost("www.parapharma.ma")).toBe(false);
    expect(isBlockedHost("images.example.com")).toBe(false);
  });
});

describe("Sécurité : rate-limit anti-spoofing", () => {
  afterEach(() => {
    delete process.env.TRUSTED_PROXY;
  });

  it("ignore X-Forwarded-For sans proxy de confiance", () => {
    const req = {
      headers: { get: (k: string) => (k === "x-forwarded-for" ? "6.6.6.6" : null) },
    } as unknown as Request;
    expect(getClientIp(req)).toBe("unknown");
  });

  it("honore X-Forwarded-For avec TRUSTED_PROXY=true", () => {
    process.env.TRUSTED_PROXY = "true";
    const req = {
      headers: { get: (k: string) => (k === "x-forwarded-for" ? "6.6.6.6" : null) },
    } as unknown as Request;
    expect(getClientIp(req)).toBe("6.6.6.6");
  });

  it("ne retire jamais une clé globale lorsqu'on spoofe XFF côté actions serveur", async () => {
    const ip = await getServerActionIp();
    expect(ip).toBe("server-action");
  });

  it("fenêtre glissante : bloque au-delà de maxRequests puis reset", () => {
    const cfg = { maxRequests: 3, windowSeconds: 60, keyPrefix: "s" };
    expect(checkRateLimit("ip-a", cfg).allowed).toBe(true);
    expect(checkRateLimit("ip-a", cfg).allowed).toBe(true);
    expect(checkRateLimit("ip-a", cfg).allowed).toBe(true);
    expect(checkRateLimit("ip-a", cfg).allowed).toBe(false);
    // Une autre IP n'est pas impactée (isolation par clé)
    expect(checkRateLimit("ip-b", cfg).allowed).toBe(true);
  });

  it("expose des configurations prédéfinies exploitable", () => {
    expect(RATE_LIMITS.login.maxRequests).toBe(5);
    expect(RATE_LIMITS.chat.maxRequests).toBe(10);
  });
});

describe("Emails : échappement anti-XSS", () => {
  it("échappe les données utilisateur dans le HTML", () => {
    const { html } = renderEmail("order-status", {
      reference: "<img src=x onerror=alert(1)>",
      statusLabel: 'label"test',
      note: "note'&<b>",
    });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
    expect(html).toContain("&quot;");
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;b&gt;");
  });

  it("échappe dans toutes les variantes", () => {
    for (const t of ["order-confirmation", "return-requested", "return-updated", "stock-alert"] as const) {
      const data = {
        reference: "<script>",
        token: "t",
        total: "10",
        fullName: "<b>X</b>",
        decision: "<i>ok</i>",
        note: "'\"",
        productName: "<em>Y</em>",
        slug: "slug",
      };
      const { html } = renderEmail(t, data);
      expect(html).not.toContain("<script>");
      expect(html).not.toContain("<b>X</b>");
    }
  });
});

describe("Logger structuré", () => {
  const originalLog = console.log;

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    console.log = originalLog;
  });

  it("émet des JSON-lines avec les champs attendus", () => {
    logger.info("orders", "order.created", {
      message: "Commande créée",
      durationMs: 12,
      requestId: "req-1",
      data: { reference: "PB-1", method: "COD" },
    });
    const line = (console.log as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const parsed = JSON.parse(line);
    expect(parsed.level).toBe("info");
    expect(parsed.module).toBe("orders");
    expect(parsed.event).toBe("order.created");
    expect(parsed.durationMs).toBe(12);
    expect(parsed.requestId).toBe("req-1");
    expect(parsed.reference).toBe("PB-1");
    expect(parsed.jsanitized).toBe(true);
  });

  it("redacte les secrets (jamais de clé/mot de passe en clair)", () => {
    logger.error("security", "auth.failed", {
      data: { passwordHash: "SUPERHASHVALUE", SESSION_SECRET: "SUPERSECRETVALUE", apiKey: "SUPERKEYVALUE" },
      message: "config",
    });
    const parsed = JSON.parse((console.log as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string);
    expect(parsed.passwordHash).toBe("***REDACTED***");
    expect(parsed.SESSION_SECRET).toBe("***REDACTED***");
    expect(parsed.apiKey).toBe("***REDACTED***");
    expect(JSON.stringify(parsed)).not.toContain("SUPERHASHVALUE");
    expect(JSON.stringify(parsed)).not.toContain("SUPERSECRETVALUE");
    expect(JSON.stringify(parsed)).not.toContain("SUPERKEYVALUE");
  });

  it("respecte LOG_LEVEL (filtre debug en dessous du niveau)", async () => {
    process.env.LOG_LEVEL = "warn";
    vi.resetModules();
    const fresh = await import("@/lib/logger");
    const logSpy = console.log as unknown as ReturnType<typeof vi.fn>;
    fresh.logger.debug("app", "noop", { message: "trace invisible" });
    expect(logSpy).not.toHaveBeenCalled();
    fresh.logger.error("app", "boom", { message: "visible" });
    expect(logSpy).toHaveBeenCalledTimes(1);
    process.env.LOG_LEVEL = "info";
    vi.resetModules();
  });
});