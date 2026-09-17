import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  customer: { findUnique: vi.fn(), update: vi.fn() },
  emailLog: { create: vi.fn() },
}));
const emailMock = vi.hoisted(() => ({ sendTransactionalEmail: vi.fn() }));

vi.mock("@/lib/db", () => ({ db: dbMock }));
vi.mock("@/lib/email", () => ({ sendTransactionalEmail: emailMock.sendTransactionalEmail }));
vi.mock("@/lib/security/rate-limit", () => ({
  RATE_LIMITS: { passwordReset: { maxRequests: 5, windowSeconds: 900, keyPrefix: "password-reset" } },
  checkRateLimit: () => ({ allowed: true, remaining: 5, resetAt: Date.now() + 60_000 }),
  getServerActionIp: async () => "127.0.0.1",
}));

import {
  createPasswordResetToken,
  createSessionToken,
  hashPassword,
  passwordResetMatches,
  readPasswordResetToken,
  readSessionToken,
  verifyPassword,
} from "../src/lib/auth";
import { requestPasswordReset, resetPassword } from "../src/lib/actions/customer";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const HASH = hashPassword("ancien-mot-de-passe");
const customer = { id: 7, email: "client@example.com", firstName: "Salma", passwordHash: HASH };

beforeEach(() => {
  vi.clearAllMocks();
  emailMock.sendTransactionalEmail.mockResolvedValue("sent");
  dbMock.customer.findUnique.mockResolvedValue(customer);
  dbMock.customer.update.mockResolvedValue({});
});

describe("jetons de réinitialisation", () => {
  it("sont valides 1 heure pour le mot de passe actuel uniquement", () => {
    const now = Date.now();
    const token = createPasswordResetToken(7, HASH, now);
    const payload = readPasswordResetToken(token, now + 59 * 60 * 1000);
    expect(payload?.sub).toBe(7);
    expect(passwordResetMatches(payload!.fp, HASH)).toBe(true);
    expect(passwordResetMatches(payload!.fp, hashPassword("nouveau"))).toBe(false);
    expect(readPasswordResetToken(token, now + 61 * 60 * 1000)).toBeNull();
  });

  it("ne sont pas interchangeables avec une session", () => {
    const reset = createPasswordResetToken(7, HASH);
    expect(readSessionToken(reset)).toBeNull();
    const session = createSessionToken({ sub: 7, email: "client@example.com" });
    expect(readPasswordResetToken(session)).toBeNull();
  });

  it("refusent une signature modifiée", () => {
    const [body] = createPasswordResetToken(7, HASH).split(".");
    expect(readPasswordResetToken(`${body}.faux`)).toBeNull();
  });
});

describe("demande de réinitialisation", () => {
  it("envoie un lien si le compte existe", async () => {
    const res = await requestPasswordReset(form({ email: "Client@Example.com" }));
    expect(res.ok).toBe(true);
    expect(dbMock.customer.findUnique).toHaveBeenCalledWith({ where: { email: "client@example.com" } });
    expect(emailMock.sendTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "client@example.com", template: "password-reset" })
    );
  });

  it("répond pareil sans révéler qu'un compte n'existe pas", async () => {
    dbMock.customer.findUnique.mockResolvedValue(null);
    const known = await requestPasswordReset(form({ email: "client@example.com" }));
    const unknown = await requestPasswordReset(form({ email: "inconnu@example.com" }));
    expect(unknown).toEqual(known);
    expect(emailMock.sendTransactionalEmail).not.toHaveBeenCalled();
  });
});

describe("nouveau mot de passe", () => {
  it("met à jour le mot de passe avec un lien valide", async () => {
    const token = createPasswordResetToken(7, HASH);
    const res = await resetPassword(form({ token, password: "nouveau-secret", confirm: "nouveau-secret" }));
    expect(res).toEqual({ ok: true });
    const saved = dbMock.customer.update.mock.calls[0][0].data.passwordHash as string;
    expect(verifyPassword("nouveau-secret", saved)).toBe(true);
  });

  it("refuse un lien déjà utilisé (mot de passe déjà changé)", async () => {
    const token = createPasswordResetToken(7, hashPassword("autre"));
    const res = await resetPassword(form({ token, password: "nouveau-secret", confirm: "nouveau-secret" }));
    expect(res.ok).toBe(false);
    expect(dbMock.customer.update).not.toHaveBeenCalled();
  });

  it("refuse une confirmation différente ou un mot de passe trop court", async () => {
    const token = createPasswordResetToken(7, HASH);
    expect((await resetPassword(form({ token, password: "abcdefg", confirm: "abcdefh" }))).ok).toBe(false);
    expect((await resetPassword(form({ token, password: "abc", confirm: "abc" }))).ok).toBe(false);
    expect(dbMock.customer.update).not.toHaveBeenCalled();
  });
});
