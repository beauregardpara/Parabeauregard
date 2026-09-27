import { Prisma } from "@prisma/client";
import { cachedCatalogue } from "@/lib/cache";
import { db } from "@/lib/db";
import { productTextWhere } from "@/lib/search/text-filter";

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

async function searchProductsUncached(filters: ProductFilters) {
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

  // Le filtre texte est monté séparément : il doit rester un seul bloc, sinon
  // deux blocs de `orBlocks` se combinent en ET et exigent que la requête
  // entière soit présente telle quelle (« moussant gel » ne trouvait rien).
  const textWhere = filters.q ? productTextWhere(filters.q, "strict") : null;
  if (textWhere) orBlocks.push(textWhere);

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

  const run = (w: Prisma.ProductWhereInput) =>
    Promise.all([
      db.product.findMany({
        where: w,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          category: true,
          images: { orderBy: { order: "asc" }, take: 1 },
          reviews: { where: { status: "APPROVED" }, select: { rating: true } },
        },
      }),
      db.product.count({ where: w }),
    ]);

  let [items, total] = await run(where);

  // Repli : si exiger tous les mots ne donne rien, on réessaie en acceptant les
  // fiches qui n'en contiennent qu'une partie. Mieux vaut des résultats
  // approchants qu'une page vide.
  if (total === 0 && filters.q) {
    const loose = productTextWhere(filters.q, "loose");
    if (loose) {
      const relaxed = { ...where, AND: orBlocks.map((b) => (b === textWhere ? loose : b)) };
      [items, total] = await run(relaxed);
    }
  }

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

async function getBrandsUncached(): Promise<string[]> {
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

/**
 * Versions mises en cache (invalidées à chaque modification de produit).
 * Les filtres font partie de la clé : deux recherches différentes ne partagent
 * jamais leur résultat.
 */
export const searchProducts = cachedCatalogue(searchProductsUncached, ["search-products"]);
export const getBrands = cachedCatalogue(getBrandsUncached, ["brands"]);
