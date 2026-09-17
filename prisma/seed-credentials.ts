/**
 * Identifiants du jeu de données de démonstration (npm run db:seed).
 *
 * Aucun mot de passe n'est écrit dans le dépôt : chaque compte lit le sien dans
 * une variable d'environnement (utile en CI) ou reçoit un mot de passe aléatoire
 * jamais affiché. Les adresses utilisent le domaine réservé « .invalid » : elles
 * ne peuvent appartenir à personne.
 */
import { randomBytes } from "node:crypto";

export const SEED_ACCOUNTS = {
  superAdmin: { email: "admin@demo.invalid", name: "Admin démo", passwordEnv: "SEED_ADMIN_PASSWORD" },
  catalogManager: { email: "catalogue@demo.invalid", name: "Catalogue démo", passwordEnv: "SEED_CATALOG_PASSWORD" },
  orderManager: { email: "commandes@demo.invalid", name: "Commandes démo", passwordEnv: "SEED_ORDERS_PASSWORD" },
  customer: { email: "client@demo.invalid", name: "Client démo", passwordEnv: "SEED_CUSTOMER_PASSWORD" },
} as const;

export const SEED_PASSWORD_MIN_LENGTH = 12;

type Env = Record<string, string | undefined>;

export function seedPassword(envName: string, env: Env = process.env): { password: string; generated: boolean } {
  const provided = env[envName]?.trim();
  if (provided) {
    if (provided.length < SEED_PASSWORD_MIN_LENGTH) {
      throw new Error(`${envName} doit contenir au moins ${SEED_PASSWORD_MIN_LENGTH} caractères.`);
    }
    return { password: provided, generated: false };
  }
  return { password: randomBytes(24).toString("base64url"), generated: true };
}

/** Hébergeurs de base de production : le seed (destructif) y est refusé. */
const PRODUCTION_DB_HOSTS = /(supabase\.co|supabase\.com|neon\.tech|rds\.amazonaws\.com)/i;

export function assertSeedTargetIsSafe(env: Env = process.env): void {
  if (env.ALLOW_SEED_IN_PROD === "true") return;
  if (env.NODE_ENV === "production") {
    throw new Error("Refus d'exécuter le seed en production (NODE_ENV=production).");
  }
  if (PRODUCTION_DB_HOSTS.test(env.DATABASE_URL ?? "")) {
    throw new Error("Refus d'exécuter le seed : DATABASE_URL pointe vers une base hébergée.");
  }
}
