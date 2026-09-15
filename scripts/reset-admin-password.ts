import { existsSync, readFileSync } from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";
import { stdin as input, stdout as output } from "node:process";
import { PrismaClient } from "@prisma/client";

function loadLocalEnv() {
  // `.env.local` overrides `.env`; variables injected by the shell always win.
  const injected = new Set(Object.keys(process.env));
  for (const file of [".env", ".env.local"]) {
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      const value = match[2].trim();
      const parsedValue = value.startsWith('"') && value.endsWith('"')
        ? value.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"')
        : value;
      // A stale shell-level SQLite URL must not override the local production
      // reset target when `.env.local` provides PostgreSQL explicitly.
      if (injected.has(match[1])) {
        if (file !== ".env.local" || match[1] !== "DATABASE_URL" || !/^file:/i.test(process.env[match[1]] ?? "") || !/^postgres(ql)?:\/\//i.test(parsedValue)) continue;
      }
      process.env[match[1]] = parsedValue;
    }
  }
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

async function askHidden(prompt: string): Promise<string> {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== "function") {
    throw new Error("An interactive terminal is required; the password was not read.");
  }
  output.write(prompt);
  input.setRawMode(true);
  input.resume();
  input.setEncoding("utf8");
  return new Promise((resolve) => {
    let value = "";
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\u0003") {
          cleanup();
          output.write("\n");
          process.exit(130);
        }
        if (char === "\r" || char === "\n") {
          cleanup();
          output.write("\n");
          resolve(value);
        } else if (char === "\u0008" || char === "\u007f") {
          value = value.slice(0, -1);
        } else if (char >= " ") {
          value += char;
        }
      }
    };
    const cleanup = () => {
      input.off("data", onData);
      input.setRawMode?.(false);
      input.pause();
    };
    input.on("data", onData);
  });
}

function getEmail() {
  const args = process.argv.slice(2);
  const index = args.indexOf("--email");
  const email = index >= 0 ? args[index + 1] : undefined;
  if (!email || !email.includes("@")) throw new Error("Usage: npm run admin:reset-password -- --email admin@example.com");
  return email.replace(/\\@/g, "@").trim().toLowerCase();
}

async function main() {
  loadLocalEnv();
  if (!/^postgres(ql)?:\/\//i.test(process.env.DATABASE_URL ?? "")) {
    throw new Error("DATABASE_URL must point to PostgreSQL for an admin production reset.");
  }
  const email = getEmail();
  const db = new PrismaClient();
  try {
    const admin = await db.adminUser.findUnique({
      where: { email },
      select: { id: true, email: true, active: true, role: true },
    });
    if (!admin) throw new Error("No administrator exists with this email.");
    if (!admin.active || !admin.role) throw new Error("The administrator account is not active or has no role.");

    const password = await askHidden("New administrator password: ");
    const confirmation = await askHidden("Confirm new administrator password: ");
    if (password.length < 12) throw new Error("The new password must contain at least 12 characters.");
    if (password !== confirmation) throw new Error("The passwords do not match.");

    await db.adminUser.update({ where: { id: admin.id }, data: { passwordHash: hashPassword(password) } });
    console.log(JSON.stringify({ updated: true, email: admin.email, active: admin.active, role: admin.role }));
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Admin password reset failed.");
  process.exitCode = 1;
});
