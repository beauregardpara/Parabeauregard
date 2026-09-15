// Verifies an ISOLATED restored database (never production) with a real Prisma query.
// Expected counts come from the live database at dump time (EXPECTED_* env vars).
const url = process.env.DATABASE_URL ?? "";
const host = (() => { try { return new URL(url).hostname; } catch { return ""; } })();
if (!["localhost", "127.0.0.1", "postgres"].includes(host)) {
  throw new Error("Refusing to verify: DATABASE_URL must point to the isolated restore database.");
}

const { default: prismaPkg } = await import("@prisma/client");
const db = new prismaPkg.PrismaClient();

function expected(name) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer.`);
  return value;
}

async function main() {
  const [products, categories, images, brandRows, sample] = await Promise.all([
    db.product.count(),
    db.category.count(),
    db.productImage.count(),
    db.product.findMany({ select: { brand: true }, distinct: ["brand"] }),
    db.product.findFirst({ where: { images: { some: {} } }, select: { id: true, slug: true, _count: { select: { images: true } } } }),
  ]);
  const brands = brandRows.filter(({ brand }) => Boolean(brand)).length;
  const result = { products, brands, categories, productImages: images, prismaSampleProductWithImages: Boolean(sample) };
  console.log(JSON.stringify(result));

  const checks = [
    ["products", products, expected("EXPECTED_PRODUCTS")],
    ["brands", brands, expected("EXPECTED_BRANDS")],
    ["categories", categories, expected("EXPECTED_CATEGORIES")],
    ["productImages", images, expected("EXPECTED_PRODUCT_IMAGES")],
  ];
  const failures = checks.filter(([, actual, want]) => want !== null && actual !== want).map(([name, actual, want]) => `${name}: restored ${actual}, expected ${want}`);
  if (products === 0) failures.push("products: restored database is empty");
  if (!sample) failures.push("no product with media metadata found");
  if (failures.length) throw new Error(`Restore verification failed: ${failures.join("; ")}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Restore verification failed.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
