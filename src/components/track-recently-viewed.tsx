"use client";

import { useEffect } from "react";
import { useRecentlyViewed } from "@/lib/recently-viewed-context";

export function TrackRecentlyViewed({
  product,
}: {
  product: {
    productId: number;
    slug: string;
    name: string;
    brand: string | null;
    imageUrl: string | null;
    price: number;
    promoPrice: number | null;
    rating: number | null;
    reviewsCount: number;
  };
}) {
  const { record } = useRecentlyViewed();
  useEffect(() => {
    record(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, product.productId]);
  return null;
}