/**
 * CLI : npm run enrich -- [--limit=N] [--batch=N]
 * Enrichit les produits existants via Firecrawl :
 *  - scrape la réputation (avis/notes) depuis les pages sources externes
 *  - améliore les descriptions (description / shortDescription / marque)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { enrichProductFromSource } from "../lib/firecrawl";

const db = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
  const limit = limitArg ? parseInt(limitArg, 10) : 20;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  if (!process.env.FIRECRAWL_API_KEY) {
    console.error("✖ FIRECRAWL_API_KEY manquante dans .env — enrichissement impossible.");
    await db.$disconnect();
    process.exit(1);
  }

  const products = await db.product.findMany({
    where: { sourceUrl: { not: null } },
    select: { id: true, name: true, sourceUrl: true, brand: true, description: true, shortDescription: true },
    orderBy: { id: "asc" },
    take: limit,
  });

  console.log(`▶ Enrichissement de ${products.length} produit(s) via Firecrawl…\n`);

  let enrichedDesc = 0;
  let enrichedBrand = 0;
  let reps = 0;

  for (const p of products) {
    const url = p.sourceUrl as string;
    process.stdout.write(`• ${p.name}… `);

    const data = await enrichProductFromSource(url, p.name);
    if (!data) {
      console.log("échec (aucune donnée)");
      await sleep(1200);
      continue;
    }

    const updates: Record<string, unknown> = {};

    // Description améliorée : on ne remplace que si on a quelque chose de mieux
    const newDesc = data.description?.trim();
    if (newDesc && newDesc.length > 40 && newDesc.length !== p.description?.length) {
      updates.description = newDesc;
      // shortDescription : la plus courte des deux (source ou dérivée)
      const newShort = data.shortDescription?.trim() ?? newDesc.slice(0, 180);
      if (newShort.length <= 500) updates.shortDescription = newShort;
      enrichedDesc++;
    }
    if (data.brand && data.brand !== p.brand) {
      updates.brand = data.brand;
      enrichedBrand++;
    }

    if (Object.keys(updates).length > 0) {
      await db.product.update({ where: { id: p.id }, data: updates });
    }

    // Réputation
    if (data.reputation) {
      await db.productReputation.upsert({
        where: { productId: p.id },
        create: {
          productId: p.id,
          averageRating: data.reputation.averageRating,
          reviewsCount: data.reputation.reviewsCount,
          source: url,
        },
        update: {
          averageRating: data.reputation.averageRating,
          reviewsCount: data.reputation.reviewsCount,
          source: url,
        },
      });

      // Avis importés (source = reputation) — on évite les doublons sur (productId, comment, author)
      for (const r of data.reputation.reviews) {
        const existing = await db.review.findFirst({
          where: { productId: p.id, source: "reputation", author: r.author, comment: r.comment },
          select: { id: true },
        });
        if (!existing) {
          await db.review.create({
            data: {
              productId: p.id,
              author: r.author.slice(0, 60),
              rating: Math.round(r.rating),
              comment: r.comment,
              verifiedPurchase: r.verified,
              status: "APPROVED",
              source: "reputation",
              sourceUrl: url,
              scrapedAt: new Date(),
            },
          });
        }
      }
      reps++;
    }

    console.log("OK" + (data.reputation ? ` (${data.reputation.reviewsCount} avis, note ${data.reputation.averageRating})` : ""));
    await sleep(1200); // délai poli entre les requêtes Firecrawl
  }

  console.log(`\n✔ Terminé : ${enrichedDesc} description(s) améliorée(s), ${enrichedBrand} marque(s) corrigée(s), ${reps} réputation(s) chargée(s).`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
