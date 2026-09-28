/** Controle du dernier lot importe : rayon, prix, photo. Lecture seule. */
import { config as chargerEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

chargerEnv({ path: ".env.local", override: true });
chargerEnv({ path: ".env" });

const db = new PrismaClient();

async function main() {
  const sources = process.argv.slice(2);
  const produits = await db.product.findMany({
    where: { sourceName: { in: sources } },
    select: { id: true, name: true, slug: true, price: true, status: true,
              category: { select: { slug: true } }, images: { select: { url: true } } },
    orderBy: { id: "asc" },
  });
  const sansImage = produits.filter((p) => p.images.length === 0);
  const sansRayon = produits.filter((p) => !p.category);
  console.log(`${produits.length} produits issus de ${sources.join(", ")}`);
  console.log(`  sans photo : ${sansImage.length}`);
  console.log(`  sans rayon : ${sansRayon.length}`);
  console.log(`  publies    : ${produits.filter((p) => p.status === "PUBLISHED").length}`);
  for (const p of sansImage.slice(0, 10)) console.log(`   SANS PHOTO : ${p.slug}`);
  console.log("\nexemples :");
  for (const p of produits.slice(0, 5)) {
    console.log(`   ${p.price} DH  ${p.category?.slug ?? "—"}  ${p.name.slice(0, 50)}`);
  }
  await db.$disconnect();
}

main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
