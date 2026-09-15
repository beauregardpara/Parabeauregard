import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { searchTermsForQuery } from "@/lib/search/synonyms";
import { foldForSearch } from "@/lib/product-name";

export type ProductFilters = {
  q?: string;
  categorySlug?: string;
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  onSaleOnly?: boolean;
  onlyRecent?: boolean;
  sort?: "recent" | "price-asc" | "price-desc" | "popular" | "name";
  page?: number;
  perPage?: number;
};

export async function getCategoryWithDescendants(categorySlug: string) {
  const cat = await db.category.findUnique({
    where: { slug: categorySlug },
    include: { children: true },
  });
  if (!cat) return null;
  return [cat, ...cat.children];
}

export async function searchProducts(filters: ProductFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = filters.perPage ?? 12;

  const where: Prisma.ProductWhereInput = { status: "PUBLISHED" };

  if (filters.onlyRecent) {
    where.createdAt = { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
  }

  if (filters.categorySlug) {
    const cats = await getCategoryWithDescendants(filters.categorySlug);
    if (!cats) return { items: [], total: 0, page, perPage, pages: 0 };
    where.categoryId = { in: cats.map((c) => c.id) };
  }

  const orBlocks: Prisma.ProductWhereInput[] = [];

  if (filters.q) {
    // `searchText` est replié (minuscules, sans accents) : indispensable car
    // SQLite compare les LIKE octet à octet — « avene » doit trouver « Avène ».
    const folded = foldForSearch(filters.q);
    orBlocks.push({
      OR: [
        ...(folded ? [{ searchText: { contains: folded } }] : []),
        { name: { contains: filters.q } },
        { brand: { contains: filters.q } },
        { shortDescription: { contains: filters.q } },
        { description: { contains: filters.q } },
      ],
    });

    const terms = searchTermsForQuery(filters.q);
    if (terms.length > 0) {
      orBlocks.push({
        OR: terms.flatMap((t) => {
          const foldedTerm = foldForSearch(t);
          return [
            ...(foldedTerm ? [{ searchText: { contains: foldedTerm } }] : []),
            { name: { contains: t } },
            { brand: { contains: t } },
            { shortDescription: { contains: t } },
            { description: { contains: t } },
          ];
        }),
      });
    }
  }

  if (filters.brands?.length) {
    where.brand = { in: filters.brands };
  }

  const priceCond: Prisma.FloatFilter = {};
  if (typeof filters.minPrice === "number") priceCond.gte = filters.minPrice;
  if (typeof filters.maxPrice === "number") priceCond.lte = filters.maxPrice;
  if (Object.keys(priceCond).length > 0) {
    orBlocks.push({
      OR: [
        { promoPrice: priceCond },
        { AND: [{ promoPrice: null }, { price: priceCond }] },
      ],
    });
  }

  if (filters.inStockOnly) {
    orBlocks.push({ OR: [{ unlimitedStock: true }, { stock: { gt: 0 } }] });
  }

  if (filters.onSaleOnly) {
    where.promoPrice = { not: null };
  }

  if (orBlocks.length > 0) {
    where.AND = [...(where.AND as Prisma.ProductWhereInput[] | undefined ?? []), ...orBlocks];
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    filters.sort === "price-asc"
      ? { price: "asc" }
      : filters.sort === "price-desc"
        ? { price: "desc" }
        : filters.sort === "name"
          ? { name: "asc" }
          : filters.sort === "popular"
            ? { soldCount: "desc" }
            : { createdAt: "desc" };

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        category: true,
        images: { orderBy: { order: "asc" }, take: 1 },
        reviews: { where: { status: "APPROVED" }, select: { rating: true } },
      },
    }),
    db.product.count({ where }),
  ]);

  return {
    items: items.map(({ reviews, ...p }) => ({
      ...p,
      imageUrl: p.images[0]?.url ?? null,
      avgRating:
        reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null,
      reviewsCount: reviews.length,
    })),
    total,
    page,
    perPage,
    pages: Math.ceil(total / perPage),
  };
}

export async function getBrands(): Promise<string[]> {
  const rows = await db.product.findMany({
    where: { status: "PUBLISHED", brand: { not: null } },
    select: { brand: true },
    distinct: ["brand"],
    orderBy: { brand: "asc" },
  });
  return rows.map((r) => r.brand!).filter(Boolean);
}

export async function getProductBySlug(slug: string) {
  return db.product.findUnique({
    where: { slug },
    include: {
      category: { include: { parent: true } },
      images: { orderBy: { order: "asc" } },
      reviews: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" } },
    },
  });
}
