"use client";

import Link from "next/link";
import { useRecentlyViewed } from "@/lib/recently-viewed-context";
import { ProductCard } from "@/components/product-card";

export function RecentlyViewedSection({ excludeId }: { excludeId?: number }) {
  const { items } = useRecentlyViewed();
  const visible = items.filter((i) => i.productId !== excludeId).slice(0, 4);

  if (visible.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="mb-6 font-display text-2xl font-extrabold text-para-950">
        <span className="mr-2" aria-hidden>🕘</span> Récemment consultés
      </h2>
      <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
        {visible.map((i) => (
          <ProductCard
            key={i.productId}
            p={{
              id: i.productId,
              name: i.name,
              slug: i.slug,
              brand: i.brand,
              price: i.price,
              promoPrice: i.promoPrice,
              stock: 0,
              unlimitedStock: true,
              imageUrl: i.imageUrl,
              avgRating: i.rating,
              reviewsCount: i.reviewsCount,
            }}
          />
        ))}
      </div>
      <Link href="/recherche" className="mt-4 inline-block text-sm font-semibold text-para-700 hover:underline">
        Voir plus de produits →
      </Link>
    </section>
  );
}