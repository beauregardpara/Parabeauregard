import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_SECRET = process.env.SESSION_SECRET!;
if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be defined in environment variables");
}
export const CUSTOMER_COOKIE = "pb_session";
export const ADMIN_COOKIE = "pb_admin";
const MAX_AGE_S = 60 * 60 * 24 * 30; // 30 jours

// Le build standalone local est servi en HTTP pour les smoke tests. Le mode
// production reste Secure par défaut ; l'exception doit être explicitement
// activée uniquement dans cet environnement local non-HTTPS.
const secureSessionCookies = process.env.NODE_ENV === "production" && process.env.SESSION_COOKIE_SECURE !== "false";

// ── Mots de passe (scrypt natif Node) ─────────────────────────────

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

// ── Jetons de session signés HMAC ────────────────────────────────

type SessionPayload = { sub: number; email: string; role?: string; exp: number };

function b64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
}

export function createSessionToken(payload: Omit<SessionPayload, "exp">): string {
  const full: SessionPayload = { ...payload, exp: Date.now() + MAX_AGE_S * 1000 };
  const body = b64url(JSON.stringify(full));
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Helpers haut niveau ───────────────────────────────────────────

export async function setCustomerSession(customerId: number, email: string) {
  const jar = await cookies();
  jar.set(CUSTOMER_COOKIE, createSessionToken({ sub: customerId, email }), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: MAX_AGE_S,
    path: "/",
    secure: secureSessionCookies,
  });
}

export async function clearCustomerSession() {
  (await cookies()).delete(CUSTOMER_COOKIE);
}

export async function getCurrentCustomer() {
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  const payload = readSessionToken(token);
  if (!payload) return null;
  return db.customer.findUnique({ where: { id: payload.sub }, include: { addresses: true } });
}

export async function setAdminSession(adminId: number, email: string, role: string) {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, createSessionToken({ sub: adminId, email, role }), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: MAX_AGE_S,
    path: "/",
    secure: secureSessionCookies,
  });
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function getAdminSession() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return readSessionToken(token);
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return db.adminUser.findUnique({ where: { id: session.sub } });
}

// ── RBAC : contrôle des rôles et permissions ──────────────────────

export type AdminRole = "SUPER_ADMIN" | "CATALOG_MANAGER" | "ORDER_MANAGER";

/** Permissions par rôle — étendre au besoin. */
const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  SUPER_ADMIN: [
    "products:read", "products:write", "products:delete",
    "categories:read", "categories:write", "categories:delete",
    "orders:read", "orders:write",
    "customers:read",
    "reviews:read", "reviews:write",
    "coupons:read", "coupons:write",
    "users:read", "users:write",
    "scraper:read", "scraper:write",
    "reputation:read", "reputation:write",
    "settings:read", "settings:write",
    "logs:read",
    "chat:read",
  ],
  CATALOG_MANAGER: [
    "products:read", "products:write",
    "categories:read", "categories:write",
    "reviews:read", "reviews:write",
    "coupons:read", "coupons:write",
    "scraper:read", "scraper:write",
    "reputation:read", "reputation:write",
    "settings:read",
  ],
  ORDER_MANAGER: [
    "orders:read", "orders:write",
    "customers:read",
    "products:read",
    "reviews:read",
    "reputation:read",
  ],
};

export function hasPermission(role: AdminRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Vérifie que l'admin connecté a le rôle requis (ou un rôle superior).
 * Retourne l'admin ou lance UNAUTHORIZED / FORBIDDEN.
 */
export async function requireRole(...allowedRoles: AdminRole[]) {
  const admin = await requireAdmin();
  if (!admin || !admin.active) throw new Error("UNAUTHORIZED");
  if (!allowedRoles.includes(admin.role as AdminRole)) throw new Error("FORBIDDEN");
  return admin;
}

/**
 * Vérifie que l'admin connecté a la permission requise.
 * Retourne l'admin ou lance UNAUTHORIZED / FORBIDDEN.
 */
export async function requirePermission(permission: string) {
  const admin = await requireAdmin();
  if (!admin || !admin.active) throw new Error("UNAUTHORIZED");
  if (!hasPermission(admin.role as AdminRole, permission)) throw new Error("FORBIDDEN");
  return admin;
}
