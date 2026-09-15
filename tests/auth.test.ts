import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

// Import must be after mocks so @/lib/db is intercepted before Prisma instantiation
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  readSessionToken,
} from "../src/lib/auth";

const SECRET_PREV = process.env.SESSION_SECRET;

beforeAll(() => {
  process.env.SESSION_SECRET = "test-vitest-secret-key-32chars-long!!";
});

afterAll(() => {
  if (SECRET_PREV !== undefined) process.env.SESSION_SECRET = SECRET_PREV;
  else delete process.env.SESSION_SECRET;
});

describe("hashPassword / verifyPassword", () => {
  it("hash un mot de passe et le vérifie", () => {
    const stored = hashPassword("azerty123");
    expect(stored).toMatch(/^[a-f0-9]{32}:[a-f0-9]{128}$/);
    expect(verifyPassword("azerty123", stored)).toBe(true);
  });
  it("refuse un mauvais mot de passe", () => {
    const stored = hashPassword("bonmotdepasse");
    expect(verifyPassword("bonmotdepasse", stored)).toBe(true);
    expect(verifyPassword("mauvais", stored)).toBe(false);
  });
  it("gère les formats invalides", () => {
    expect(verifyPassword("x", "no-salt-no-hash")).toBe(false);
    expect(verifyPassword("x", "ab:cd")).toBe(false);
  });
});

describe("session tokens", () => {
  it("crée et lit un jeton valide", () => {
    const token = createSessionToken({ sub: 1, email: "test@ex.ma" });
    const payload = readSessionToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe(1);
    expect(payload!.email).toBe("test@ex.ma");
  });

  it("rejette un jeton altéré (signature)", () => {
    const token = createSessionToken({ sub: 2, email: "a@b.ma" });
    const [body, sig] = token.split(".");
    const tampered = `${body}.${sig.slice(0, -1)}${sig.endsWith("A") ? "B" : "A"}`;
    expect(readSessionToken(tampered)).toBeNull();
  });

  it("rejette un jeton expiré", () => {
    const full = { sub: 3, email: "c@d.ma", exp: Date.now() - 1000 };
    const b64 = Buffer.from(JSON.stringify(full)).toString("base64url");
    const hmac = require("crypto").createHmac("sha256", process.env.SESSION_SECRET).update(b64).digest("base64url");
    expect(readSessionToken(`${b64}.${hmac}`)).toBeNull();
  });

  it("retourne null pour undefined/chaîne vide", () => {
    expect(readSessionToken(undefined)).toBeNull();
    expect(readSessionToken("")).toBeNull();
    expect(readSessionToken("invalid")).toBeNull();
  });
});