"use server";

import { db } from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  setCustomerSession,
  clearCustomerSession,
  createPasswordResetToken,
  readPasswordResetToken,
  passwordResetMatches,
} from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS, getServerActionIp } from "@/lib/security/rate-limit";
import { registerSchema, loginSchema, emailSchema, passwordSchema } from "@/lib/validation/schemas";
import { sendTransactionalEmail } from "@/lib/email";

export type AuthResult = { ok: true } | { ok: false; error: string };

export async function registerCustomer(formData: FormData): Promise<AuthResult> {
  const ip = await getServerActionIp();
  const rl = checkRateLimit(ip, RATE_LIMITS.register);
  if (!rl.allowed) return { ok: false, error: "Trop d'inscriptions. Réessayez plus tard." };

  const parsed = registerSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
    firstName: String(formData.get("firstName") ?? "").trim(),
    lastName: String(formData.get("lastName") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim() || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };

  const { email, password, firstName, lastName, phone } = parsed.data;

  const exists = await db.customer.findUnique({ where: { email } });
  // Message volontairement neutre pour éviter l'énumération des comptes existants.
  if (exists) return { ok: false, error: "L'inscription n'a pas pu être finalisée. Vérifiez vos informations." };

  const customer = await db.customer.create({
    data: { email, passwordHash: hashPassword(password), firstName, lastName, phone: phone ?? null },
  });

  await setCustomerSession(customer.id, customer.email);
  return { ok: true };
}

export async function loginCustomer(formData: FormData): Promise<AuthResult> {
  const ip = await getServerActionIp();
  const rl = checkRateLimit(ip, RATE_LIMITS.login);
  if (!rl.allowed) return { ok: false, error: "Trop de tentatives. Réessayez plus tard." };

  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };

  const { email, password } = parsed.data;

  const customer = await db.customer.findUnique({ where: { email } });
  if (!customer || !verifyPassword(password, customer.passwordHash)) {
    return { ok: false, error: "Email ou mot de passe incorrect." };
  }

  await setCustomerSession(customer.id, customer.email);
  return { ok: true };
}

export async function logoutCustomer() {
  await clearCustomerSession();
}

export type PasswordResetRequestResult = { ok: true; message: string } | { ok: false; error: string };

const RESET_REQUEST_MESSAGE =
  "Si un compte existe avec cette adresse, un email contenant un lien de réinitialisation vient d'être envoyé. Le lien est valable 1 heure.";

/** Demande de lien de réinitialisation — réponse identique que le compte existe ou non. */
export async function requestPasswordReset(formData: FormData): Promise<PasswordResetRequestResult> {
  const ip = await getServerActionIp();
  const rl = checkRateLimit(ip, RATE_LIMITS.passwordReset);
  if (!rl.allowed) return { ok: false, error: "Trop de demandes. Réessayez plus tard." };

  const parsed = emailSchema.safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Adresse email invalide." };

  const customer = await db.customer.findUnique({ where: { email: parsed.data } });
  if (customer) {
    await sendTransactionalEmail({
      to: customer.email,
      template: "password-reset",
      data: { firstName: customer.firstName, token: createPasswordResetToken(customer.id, customer.passwordHash) },
    });
  }
  return { ok: true, message: RESET_REQUEST_MESSAGE };
}

/** Définit un nouveau mot de passe à partir d'un lien valide. */
export async function resetPassword(formData: FormData): Promise<AuthResult> {
  const ip = await getServerActionIp();
  const rl = checkRateLimit(ip, RATE_LIMITS.passwordReset);
  if (!rl.allowed) return { ok: false, error: "Trop de tentatives. Réessayez plus tard." };

  const invalid = { ok: false as const, error: "Ce lien n'est plus valide. Faites une nouvelle demande de réinitialisation." };
  const token = readPasswordResetToken(String(formData.get("token") ?? ""));
  if (!token) return invalid;

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Mot de passe invalide." };
  if (password !== confirm) return { ok: false, error: "Les deux mots de passe ne correspondent pas." };

  const customer = await db.customer.findUnique({ where: { id: token.sub } });
  if (!customer || !passwordResetMatches(token.fp, customer.passwordHash)) return invalid;

  await db.customer.update({ where: { id: customer.id }, data: { passwordHash: hashPassword(parsed.data) } });
  await clearCustomerSession();
  return { ok: true };
}
