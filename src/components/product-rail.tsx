import { db } from "@/lib/db";
import { ProductCard } from "@/components/product-card";

export async function ProductRail({
  title,
  subtitle,
  excludeIds = [],
  limit = 8,
}: {
  title: string;
  subtitle?: string;
  excludeIds?: number[];
  limit?: number;
}) {
  const products = await db.product.findMany({
    where: {
      status: "PUBLISHED",
      ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
    },
    orderBy: { soldCount: "desc" },
    take: limit,
    include: { images: { orderBy: { order: "asc" }, take: 1 } },
  });

  if (!products.length) return null;

  return (
    <section aria-label={title} className="mt-16">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-para-950 sm:text-3xl">{title}</h2>
          {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} p={{ ...p, imageUrl: p.images[0]?.url ?? null }} />
        ))}
      </div>
    </section>
  );
}