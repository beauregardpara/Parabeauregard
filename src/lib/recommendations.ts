import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type RecommendationProduct = {
  id: number;
  name: string;
  slug: string;
  brand: string | null;
  price: number;
  promoPrice: number | null;
  imageUrl: string | null;
  soldCount: number;
};

const recSelect = {
  id: true,
  name: true,
  slug: true,
  brand: true,
  price: true,
  promoPrice: true,
  soldCount: true,
  images: { orderBy: { order: "asc" as const }, take: 1 },
} satisfies Prisma.ProductSelect;

type RecRow = Prisma.ProductGetPayload<{ select: typeof recSelect }>;

/**
 * Un produit n'est recommandable que s'il est réellement commandable :
 * proposer une rupture de stock en cross-sell ou en « produit similaire »
 * n'apporte rien au client.
 */
const AVAILABLE = {
  status: "PUBLISHED",
  OR: [{ unlimitedStock: true }, { stock: { gt: 0 } }],
} satisfies Prisma.ProductWhereInput;

function mapProduct(p: RecRow): RecommendationProduct {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    brand: p.brand,
    price: p.price,
    promoPrice: p.promoPrice,
    imageUrl: p.images[0]?.url ?? null,
    soldCount: p.soldCount,
  };
}

export async function getSimilarProducts(
  productId: number,
  categoryId: number | null,
  brand: string | null,
  excludeSlug: string
): Promise<RecommendationProduct[]> {
  const orBlocks: Prisma.ProductWhereInput[] = [];
  if (categoryId != null) orBlocks.push({ categoryId });
  if (brand) orBlocks.push({ brand });
  if (orBlocks.length === 0) return [];

  const rows = await db.product.findMany({
    where: {
      ...AVAILABLE,
      id: { not: productId },
      slug: { not: excludeSlug },
      AND: [{ OR: orBlocks }],
    },
    orderBy: { soldCount: "desc" },
    take: 4,
    select: recSelect,
  });
  return rows.map(mapProduct);
}

export async function getPopularProducts(take = 4): Promise<RecommendationProduct[]> {
  const rows = await db.product.findMany({
    where: AVAILABLE,
    orderBy: [{ soldCount: "desc" }, { viewsCount: "desc" }],
    take,
    select: recSelect,
  });
  return rows.map(mapProduct);
}

export async function getNewArrivals(take = 4): Promise<RecommendationProduct[]> {
  const rows = await db.product.findMany({
    where: AVAILABLE,
    orderBy: [{ isNew: "desc" }, { createdAt: "desc" }],
    take,
    select: recSelect,
  });
  return rows.map(mapProduct);
}

export async function getPersonalized(
  customerId: number,
  take = 4
): Promise<RecommendationProduct[]> {
  const orderItems = await db.orderItem.findMany({
    where: {
      order: { customerId, status: { not: "CANCELLED" } },
      product: { status: "PUBLISHED" },
    },
    select: {
      quantity: true,
      product: { select: { id: true, categoryId: true, brand: true } },
    },
  });

  const categoryCounts = new Map<number, number>();
  const brandCounts = new Map<string, number>();
  for (const item of orderItems) {
    const p = item.product;
    if (!p) continue;
    if (p.categoryId != null) {
      categoryCounts.set(p.categoryId, (categoryCounts.get(p.categoryId) ?? 0) + item.quantity);
    }
    if (p.brand) {
      brandCounts.set(p.brand, (brandCounts.get(p.brand) ?? 0) + item.quantity);
    }
  }

  if (categoryCounts.size === 0 && brandCounts.size === 0) {
    return getPopularProducts(take);
  }

  const topCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);
  const topBrands = [...brandCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  const orBlocks: Prisma.ProductWhereInput[] = [];
  if (topCategories.length > 0) orBlocks.push({ categoryId: { in: topCategories } });
  if (topBrands.length > 0) orBlocks.push({ brand: { in: topBrands } });

  const rows = await db.product.findMany({
    where: { ...AVAILABLE, AND: [{ OR: orBlocks }] },
    orderBy: { soldCount: "desc" },
    take,
    select: recSelect,
  });

  if (rows.length === 0) {
    return getPopularProducts(take);
  }

  return rows.map(mapProduct);
}