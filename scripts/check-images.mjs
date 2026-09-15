import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

try {
  const imgs = await prisma.productImage.findMany({ select: { url: true }, distinct: ["url"] });
  const urls = [...new Set(imgs.map((i) => i.url))];
  console.log(`— ${urls.length} URL(s) d'images produits en base :`);
  for (const u of urls) {
    const file = join(process.cwd(), "public", u.replace(/^\//, "").split("?")[0]);
    console.log(`  ${existsSync(file) ? "OK " : "MANQUANT ❌"} ${u}`);
  }

  const cats = await prisma.category.findMany({ select: { name: true, imageUrl: true, icon: true } });
  console.log("\n— Catégories :");
  for (const c of cats) {
    if (!c.imageUrl) {
      console.log(`  (aucune image — icône ${c.icon ?? "?"}) ${c.name}`);
      continue;
    }
    const file = join(process.cwd(), "public", c.imageUrl.replace(/^\//, ""));
    console.log(`  ${existsSync(file) ? "OK " : "MANQUANT ❌"} ${c.name} → ${c.imageUrl}`);
  }
} finally {
  await prisma.$disconnect();
}
