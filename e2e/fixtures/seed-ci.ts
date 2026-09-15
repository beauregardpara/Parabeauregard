/**
 * Deterministic CI fixtures for the Playwright suite — run AFTER `npm run db:seed`.
 *
 * Only synthetic data: no production rows, customers or secrets. It
 *  1. fills `searchText` for the demo catalogue (the demo seed leaves it empty,
 *     so accent-insensitive searches such as « creme » found nothing),
 *  2. gives every demo product a raster image that exists in /public,
 *  3. upserts the fixture product used by the store / mobile specs, whose raw
 *     description reproduces the scraper artefacts that cleanDescription() fixes.
 *
 * Refuses to run against anything but a local database.
 */
import { PrismaClient } from "@prisma/client";
import { buildSearchText } from "../../src/lib/product-name";

const url = process.env.DATABASE_URL ?? "";
const isLocal = /^file:/.test(url) || /@(localhost|127\.0\.0\.1|postgres)(:\d+)?\//.test(url);
if (!isLocal) {
  throw new Error("seed-ci refuses to run: DATABASE_URL must point to a local CI database.");
}

const prisma = new PrismaClient();
const FIXTURE_IMAGE = "/images/premium/univers/face.webp";
export const FIXTURE_SLUG = "guinot-longue-vie-creme-jeunesse-revitalisante-visage-homme-50-ml";
export const HIDDEN_FIXTURE_SLUG = "ci-hidden-fixture-product";
export const HIDDEN_FIXTURE_NAME = "CI Hidden Fixture Zephyrine";

async function main() {
  const products = await prisma.product.findMany({ select: { id: true, name: true, brand: true } });
  for (const product of products) {
    await prisma.product.update({
      where: { id: product.id },
      data: { searchText: buildSearchText([product.name, product.brand]) },
    });
  }
  await prisma.productImage.updateMany({ where: { url: { endsWith: ".svg" } }, data: { url: FIXTURE_IMAGE } });

  const category = await prisma.category.findFirst({ where: { slug: { contains: "cremes" } } })
    ?? await prisma.category.findFirst({ orderBy: { id: "asc" } });

  const name = "Guinot Longue Vie Crème Jeunesse Revitalisante Visage Homme 50 ml";
  const brand = "Guinot";
  const shortDescription = "Soin anti-âge qui revitalise la peau.Le soin agit en 3 actions, il :Dynamise, hydrate et protège.";
  const data = {
    name,
    brand,
    shortDescription,
    description: `${shortDescription}\n\nLire la suite\n\nFormat 50 ml.`,
    price: 420,
    status: "PUBLISHED" as const,
    stock: 25,
    unlimitedStock: false,
    categoryId: category?.id ?? null,
    sourceName: "manuel",
    searchText: buildSearchText([name, brand]),
  };
  const fixture = await prisma.product.upsert({
    where: { slug: FIXTURE_SLUG },
    update: data,
    create: { ...data, slug: FIXTURE_SLUG, sku: "CI-FIXTURE-001" },
  });
  await prisma.productImage.deleteMany({ where: { productId: fixture.id } });
  await prisma.productImage.create({ data: { productId: fixture.id, url: FIXTURE_IMAGE, alt: name, order: 0 } });
  await prisma.productReputation.deleteMany({ where: { productId: fixture.id } });

  // Non-public fixture: must never leak through the storefront (title, metadata, sitemap, search).
  const hiddenData = {
    name: HIDDEN_FIXTURE_NAME,
    brand: "Guinot",
    shortDescription: "Fiche archivée de test CI.",
    description: "Fiche archivée de test CI.",
    price: 123,
    status: "HIDDEN" as const,
    stock: 5,
    unlimitedStock: false,
    categoryId: category?.id ?? null,
    sourceName: "manuel",
    searchText: buildSearchText([HIDDEN_FIXTURE_NAME, "Guinot"]),
  };
  const hidden = await prisma.product.upsert({
    where: { slug: HIDDEN_FIXTURE_SLUG },
    update: hiddenData,
    create: { ...hiddenData, slug: HIDDEN_FIXTURE_SLUG, sku: "CI-HIDDEN-001" },
  });
  await prisma.productImage.deleteMany({ where: { productId: hidden.id } });
  await prisma.productImage.create({ data: { productId: hidden.id, url: FIXTURE_IMAGE, alt: HIDDEN_FIXTURE_NAME, order: 0 } });

  const published = await prisma.product.count({ where: { status: "PUBLISHED" } });
  console.log(JSON.stringify({ ok: true, products: products.length + 2, published, fixture: FIXTURE_SLUG }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "seed-ci failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
