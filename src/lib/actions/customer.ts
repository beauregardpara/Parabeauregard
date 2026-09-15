"use server";

import { db } from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  setCustomerSession,
  clearCustomerSession,
} from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS, getServerActionIp } from "@/lib/security/rate-limit";
import { registerSchema, loginSchema } from "@/lib/validation/schemas";

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
