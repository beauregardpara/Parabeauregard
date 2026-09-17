import { afterEach, describe, expect, it } from "vitest";
import { getClientIp, ipFromTrustedHeaders } from "../src/lib/security/rate-limit";

const ENV = { TRUSTED_PROXY: process.env.TRUSTED_PROXY, VERCEL: process.env.VERCEL };

afterEach(() => {
  for (const [key, value] of Object.entries(ENV)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function req(headers: Record<string, string>) {
  return new Request("http://localhost/api/chat", { headers });
}

describe("IP client pour le limiteur de débit", () => {
  it("ignore X-Forwarded-For sans proxy de confiance (anti-usurpation)", () => {
    delete process.env.TRUSTED_PROXY;
    delete process.env.VERCEL;
    expect(ipFromTrustedHeaders(() => "203.0.113.9")).toBeNull();
    expect(getClientIp(req({ "x-forwarded-for": "203.0.113.9" }))).toBe("unknown");
  });

  it("sur Vercel, chaque visiteur a sa propre limite", () => {
    delete process.env.TRUSTED_PROXY;
    process.env.VERCEL = "1";
    expect(getClientIp(req({ "x-vercel-forwarded-for": "198.51.100.7", "x-forwarded-for": "10.0.0.1" }))).toBe("198.51.100.7");
    expect(getClientIp(req({ "x-forwarded-for": "198.51.100.8, 10.0.0.1" }))).toBe("198.51.100.8");
  });

  it("derrière un proxy déclaré (TRUSTED_PROXY=true)", () => {
    delete process.env.VERCEL;
    process.env.TRUSTED_PROXY = "true";
    expect(getClientIp(req({ "x-real-ip": "192.0.2.4" }))).toBe("192.0.2.4");
  });
});
