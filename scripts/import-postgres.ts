import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const inputArg = process.argv.find((arg) => arg.startsWith("--input="))?.slice("--input=".length);
const input = resolve(inputArg ?? "artifacts/migration-export/sqlite-export.json");
const confirmation = process.env.MIGRATION_CONFIRM;

if (!/^postgres(ql)?:\/\//i.test(process.env.DATABASE_URL ?? "")) {
  throw new Error("PostgreSQL import requires DATABASE_URL=postgresql://... .");
}
if (confirmation !== "YES") {
  throw new Error("Refusing import. Set MIGRATION_CONFIRM=YES only after reviewing the export and target.");
}

const importOrder = [
  "category", "product", "productImage", "productReputation", "priceHistory", "stockHistory",
  "scrapeRun", "customer", "address", "favorite", "coupon", "review", "banner",
  "chatSession", "chatMessage", "chatNeed", "adminUser", "activityLog", "setting", "dataQualityIssue",
  "emailLog", "cartItem", "order", "orderItem", "orderStatusHistory", "returnRequest", "productAlert", "loyaltyTransaction",
] as const;

const sequenceModels = [
  "Category", "Product", "ProductImage", "ProductReputation", "PriceHistory", "StockHistory", "ScrapeRun",
  "Customer", "Favorite", "LoyaltyTransaction", "Address", "Order", "OrderItem", "OrderStatusHistory",
  "ReturnRequest", "ProductAlert", "Coupon", "Review", "Banner", "ChatSession", "ChatMessage", "ChatNeed",
  "AdminUser", "ActivityLog", "DataQualityIssue", "EmailLog", "CartItem",
] as const;

type ExportFile = { format: number; counts: Record<string, number>; tables: Record<string, unknown[]> };

async function main() {
  const payload = JSON.parse(readFileSync(input, "utf8")) as ExportFile;
  if (payload.format !== 1 || !payload.tables || payload.counts.product !== 559) {
    throw new Error("Export format or product count is not the expected audited format.");
  }

  const existing = await Promise.all([
    db.product.count(),
    db.category.count(),
    db.customer.count(),
    db.order.count(),
  ]);
  if (existing.some((count) => count > 0) && process.env.MIGRATION_ALLOW_NONEMPTY !== "YES") {
    throw new Error("Target PostgreSQL is not empty. Set MIGRATION_ALLOW_NONEMPTY=YES only with an approved merge plan.");
  }

  await db.$transaction(async (tx) => {
    for (const model of importOrder) {
      const rows = payload.tables[model] ?? [];
      if (!rows.length) continue;

      const batchSize = model === "product" ? 100 : 500;
      for (let offset = 0; offset < rows.length; offset += batchSize) {
        const batch = rows.slice(offset, offset + batchSize);
        await (tx as any)[model].createMany({ data: batch });
        if (model === "product") {
          console.log(`Products ${Math.min(offset + batch.length, rows.length)}/${rows.length}`);
        }
      }
    }

    // IDs are preserved during the import; advance every serial sequence so the
    // first new production write cannot collide with an imported ID.
    for (const model of sequenceModels) {
      await tx.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${model}"', 'id'), COALESCE(MAX("id"), 1), MAX("id") IS NOT NULL) FROM "${model}"`
      );
    }
  }, { maxWait: 15_000, timeout: 120_000 });

  const counts = {
    products: await db.product.count(),
    categories: await db.category.count(),
    images: await db.productImage.count(),
    customers: await db.customer.count(),
    admins: await db.adminUser.count(),
    orders: await db.order.count(),
    reputations: await db.productReputation.count(),
  };
  console.log(JSON.stringify({ input, counts }, null, 2));
}

main().finally(() => db.$disconnect());
