/**
 * Contenu de démonstration NON destructif pour le catalogue déjà en base.
 *
 * `prisma/seed.ts` remet le catalogue à zéro : il ne peut pas être utilisé sur
 * une base contenant les produits issus du scraping. Ce script complète le
 * catalogue existant sans rien supprimer :
 *   - avis clients approuvés (le socle « notes / avis » du site est sinon vide) ;
 *   - mise en avant éditoriale (`isFeatured`) et nouveautés (`isNew`).
 *
 * ⚠️ Les avis créés ici sont des DONNÉES DE DÉMONSTRATION. Avant une mise en
 * production réelle, supprimez-les depuis /admin/avis ou via `--purge`.
 *
 *   npm run seed:demo            → aperçu
 *   npm run seed:demo -- --write → applique
 *   npm run seed:demo -- --purge → supprime les avis de démonstration
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const WRITE = process.argv.includes("--write");
const PURGE = process.argv.includes("--purge");

/** Marqueur permettant de retrouver et purger les avis de démonstration. */
const DEMO_SOURCE = "demo";

const REVIEW_TEMPLATES: { author: string; rating: number; comment: string; verified: boolean }[] = [
  { author: "Salma B.", rating: 5, comment: "Produit authentique et bien emballé, livré en 24h à Casablanca.", verified: true },
  { author: "Youssef A.", rating: 4, comment: "Conforme à la description, bon rapport qualité-prix.", verified: true },
  { author: "Imane K.", rating: 5, comment: "Exactement le produit que j'utilise en pharmacie, et moins cher.", verified: true },
  { author: "Mehdi R.", rating: 4, comment: "Commande simple, paiement à la livraison très pratique.", verified: false },
  { author: "Nadia T.", rating: 5, comment: "Texture agréable, ma peau la supporte très bien au quotidien.", verified: true },
  { author: "Hamza L.", rating: 4, comment: "Emballage soigné, livraison dans les délais annoncés.", verified: false },
];

/** Produits mis en avant : marques structurantes du catalogue. */
const FEATURED_BRANDS = ["La Roche-Posay", "Avène", "Bioderma", "CeraVe", "Vichy", "Uriage", "SVR", "Nuxe"];

async function purge() {
  const { count } = await db.review.deleteMany({ where: { source: DEMO_SOURCE } });
  process.stdout.write(`✔ ${count} avis de démonstration supprimé(s).\n`);
}

async function main() {
  if (PURGE) return purge();

  // ── 1. Avis de démonstration ────────────────────────────────────
  // Un produit par marque mise en avant, plus les mieux notés du catalogue.
  const targets = await db.product.findMany({
    where: { status: "PUBLISHED", images: { some: {} } },
    orderBy: [{ brand: "asc" }, { id: "asc" }],
    select: { id: true, name: true, brand: true },
    take: 400,
  });

  // Sélection déterministe : 1 produit sur 10, plafonnée à 40 produits.
  const chosen = targets.filter((_, i) => i % 10 === 0).slice(0, 40);

  let createdReviews = 0;
  for (const [index, product] of chosen.entries()) {
    // 2 ou 3 avis par produit, choisis de façon déterministe.
    const count = 2 + (index % 2);
    for (let k = 0; k < count; k++) {
      const tpl = REVIEW_TEMPLATES[(index + k) % REVIEW_TEMPLATES.length];
      const exists = await db.review.findFirst({
        where: { productId: product.id, author: tpl.author, source: DEMO_SOURCE },
        select: { id: true },
      });
      if (exists) continue;
      createdReviews += 1;
      if (WRITE) {
        await db.review.create({
          data: {
            productId: product.id,
            author: tpl.author,
            rating: tpl.rating,
            comment: tpl.comment,
            verifiedPurchase: tpl.verified,
            status: "APPROVED",
            source: DEMO_SOURCE,
          },
        });
      }
    }
  }

  // ── 2. Mise en avant éditoriale ─────────────────────────────────
  const featuredIds: number[] = [];
  for (const brand of FEATURED_BRANDS) {
    const p = await db.product.findFirst({
      where: { status: "PUBLISHED", brand, images: { some: {} } },
      orderBy: { promoPrice: { sort: "desc", nulls: "last" } },
      select: { id: true },
    });
    if (p) featuredIds.push(p.id);
  }

  // ── 3. Nouveautés : les 12 références les plus récentes ─────────
  const recent = await db.product.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { id: true },
  });

  // ── 4. Bannières de catégorie inexploitables ────────────────────
  // Les visuels /brand/*.webp sont des images génériques comportant du texte
  // en langue étrangère et des flacons de marques inexistantes : on cesse de
  // les afficher, l'icône du rayon sert de repère visuel.
  const withBanner = await db.category.findMany({
    where: { imageUrl: { startsWith: "/brand/" } },
    select: { id: true },
  });

  // Icônes des sous-rayons, pour que chaque page de catégorie ait son repère.
  const ICONS: Record<string, string> = {
    "cremes-hydratantes": "💧",
    "anti-age": "⏳",
    "nettoyants-demaquillants": "🫧",
    "anti-chute": "🌱",
    shampoings: "🧴",
    vitamines: "🍊",
    "change-soins": "🧷",
    "alimentation-bebe": "🍼",
    "protection-solaire": "☀️",
    minceur: "🏃",
  };
  const missingIcons = await db.category.findMany({
    where: { icon: null },
    select: { id: true, slug: true },
  });

  if (WRITE) {
    await db.category.updateMany({
      where: { id: { in: withBanner.map((c) => c.id) } },
      data: { imageUrl: null },
    });
    for (const cat of missingIcons) {
      const icon = ICONS[cat.slug];
      if (icon) await db.category.update({ where: { id: cat.id }, data: { icon } });
    }
    await db.product.updateMany({ where: { isFeatured: true }, data: { isFeatured: false } });
    await db.product.updateMany({ where: { id: { in: featuredIds } }, data: { isFeatured: true } });
    await db.product.updateMany({ where: { isNew: true }, data: { isNew: false } });
    await db.product.updateMany({ where: { id: { in: recent.map((r) => r.id) } }, data: { isNew: true } });
  }

  process.stdout.write(
    `${WRITE ? "✔ Appliqué" : "▶ Aperçu (utilisez --write pour appliquer)"} :\n` +
      `  ${createdReviews} avis de démonstration sur ${chosen.length} produit(s)\n` +
      `  ${featuredIds.length} produit(s) mis en avant\n` +
      `  ${recent.length} nouveauté(s)\n` +
      `  ${withBanner.length} bannière(s) de catégorie inexploitable(s) retirée(s)\n` +
      `  ${missingIcons.filter((c) => ICONS[c.slug]).length} icône(s) de rayon complétée(s)\n`
  );
}

main()
  .catch((err) => {
    process.exitCode = 1;
    process.stderr.write(`Échec : ${(err as Error).message}\n`);
  })
  .finally(() => db.$disconnect());
