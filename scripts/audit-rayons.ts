/**
 * Exporte le catalogue avec son rangement actuel, pour audit des rayons.
 *
 * Lecture seule. Sortie : <dossier>/catalogue.json
 */
import { config as chargerEnv } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

chargerEnv({ path: ".env.local", override: true });
chargerEnv({ path: ".env" });

const dossier = process.argv[2];
if (!dossier) { console.error("usage: tsx scripts/audit-rayons.ts <dossier>"); process.exit(1); }
fs.mkdirSync(dossier, { recursive: true });

const db = new PrismaClient();

async function main() {
  const categories = await db.category.findMany({
    select: { id: true, name: true, slug: true, parentId: true },
    orderBy: { id: "asc" },
  });
  const produits = await db.product.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, name: true, brand: true, categoryId: true, shortDescription: true },
    orderBy: { id: "asc" },
  });

  fs.writeFileSync(path.join(dossier, "catalogue.json"),
    JSON.stringify({ categories, produits }, null, 1));

  const parId = new Map(categories.map((c) => [c.id, c]));
  console.log("Rayons :");
  for (const c of categories) {
    const n = produits.filter((p) => p.categoryId === c.id).length;
    const parent = c.parentId ? ` (sous-rayon de ${parId.get(c.parentId)?.name})` : "";
    console.log(`  ${String(n).padStart(4)}  ${c.slug}${parent}`);
  }
  console.log(`  ${String(produits.filter((p) => p.categoryId == null).length).padStart(4)}  (sans rayon)`);
  console.log(`\n${produits.length} produits publies`);
  await db.$disconnect();
}

main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
