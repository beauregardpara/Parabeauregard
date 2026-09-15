import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const models = [
  "category", "product", "productImage", "productReputation", "priceHistory", "stockHistory",
  "scrapeRun", "customer", "favorite", "loyaltyTransaction", "address", "order", "orderItem",
  "orderStatusHistory", "returnRequest", "productAlert", "coupon", "review", "banner", "chatSession",
  "chatMessage", "chatNeed", "adminUser", "activityLog", "setting", "dataQualityIssue", "emailLog", "cartItem",
] as const;

const outputArg = process.argv.find((arg) => arg.startsWith("--output="))?.slice("--output=".length);
const output = resolve(outputArg ?? "artifacts/migration-export/sqlite-export.json");

if (!process.env.DATABASE_URL?.startsWith("file:")) {
  throw new Error("SQLite export requires DATABASE_URL=file:... and never exports from a PostgreSQL target.");
}

async function main() {
  const tables: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};
  for (const model of models) {
    const rows = await (db as any)[model].findMany();
    tables[model] = rows;
    counts[model] = rows.length;
  }
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify({ format: 1, exportedAt: new Date().toISOString(), counts, tables }, null, 2), "utf8");
  console.log(JSON.stringify({ output, counts }, null, 2));
}

main().finally(() => db.$disconnect());
