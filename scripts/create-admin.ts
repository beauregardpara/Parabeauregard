import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

async function ask(question: string): Promise<string> {
  const rl = createInterface({ input, output });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

async function main() {
  if (process.env.NODE_ENV !== "production") {
    console.warn("Admin creation is intended for a production-like environment; continuing only with explicit credentials.");
  }
  const email = (process.env.ADMIN_EMAIL ?? await ask("Admin email: ")).trim().toLowerCase();
  const name = (process.env.ADMIN_NAME ?? await ask("Admin name: ")).trim();
  const password = process.env.ADMIN_PASSWORD ?? await ask("Admin password (never logged): ");
  const role = process.env.ADMIN_ROLE ?? "SUPER_ADMIN";

  if (!email || !email.includes("@") || !name || password.length < 12) {
    throw new Error("Email, name and a password of at least 12 characters are required.");
  }
  if (!["SUPER_ADMIN", "CATALOG_MANAGER", "ORDER_MANAGER"].includes(role)) {
    throw new Error("ADMIN_ROLE is invalid.");
  }
  if (await db.adminUser.findUnique({ where: { email } })) {
    throw new Error("An admin with this email already exists; no update was performed.");
  }

  const admin = await db.adminUser.create({
    data: { email, name, passwordHash: hashPassword(password), role: role as "SUPER_ADMIN" | "CATALOG_MANAGER" | "ORDER_MANAGER" },
    select: { id: true, email: true, name: true, role: true },
  });
  console.log(JSON.stringify({ created: admin }, null, 2));
}

main().finally(() => db.$disconnect());
