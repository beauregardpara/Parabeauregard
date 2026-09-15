import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const totals: Record<string, number> = {};
  for (const m of ["product", "category", "productImage", "scrapeRun", "order", "customer", "adminUser", "review", "coupon", "setting", "productReputation"] as const) {
    totals[m] = await (db as any)[m].count();
  }
  const products = await db.product.findMany({
    select: { id: true, sku: true, slug: true, price: true, promoPrice: true, stock: true, _count: { select: { images: true } } },
  });
  const brands = await db.product.findMany({ select: { brand: true }, distinct: ["brand"] });
  const skuGroups = new Map<string, number[]>();
  for (const product of products) {
    if (product.sku) skuGroups.set(product.sku, [...(skuGroups.get(product.sku) ?? []), product.id]);
  }
  const duplicateSkus = [...skuGroups.entries()].filter(([, ids]) => ids.length > 1);
  const quality = {
    distinctBrands: brands.filter(({ brand }) => Boolean(brand)).length,
    missingImageIds: products.filter(({ _count }) => _count.images === 0).map(({ id }) => id),
    invalidPriceIds: products
      .filter(({ price, promoPrice }) => !Number.isFinite(price) || price < 0 || (promoPrice !== null && (promoPrice < 0 || promoPrice > price)))
      .map(({ id }) => id),
    negativeStockIds: products.filter(({ stock }) => stock < 0).map(({ id }) => id),
    duplicateSlugIds: products.filter((product, index, all) => all.findIndex((candidate) => candidate.slug === product.slug) !== index).map(({ id }) => id),
    duplicateSkus,
  };
  const cats = await db.category.findMany({ select: { name: true, _count: { select: { products: true } } } });
  const srcs = await db.product.groupBy({ by: ["sourceName", "status"], _count: true });
  console.log(JSON.stringify({ totals, quality, cats, srcs }, null, 2));
}

main().finally(() => db.$disconnect());
