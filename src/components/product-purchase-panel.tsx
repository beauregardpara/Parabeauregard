"use client";

import { useState } from "react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { FavoriteButton } from "@/components/favorite-button";

type ProductPurchaseData = {
  productId: number;
  slug: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  price: number;
  promoPrice: number | null;
  rating: number | null;
  reviewsCount: number;
  maxStock: number; // -1 = illimité
  outOfStock: boolean;
};

export function ProductPurchasePanel({ product }: { product: ProductPurchaseData }) {
  const [qty, setQty] = useState(1);
  const max = product.maxStock < 0 ? 99 : product.maxStock;

  const clamp = (v: number) => Math.max(1, Math.min(v, Math.max(1, max)));

  return (
    <div className="mt-7 flex flex-wrap items-center gap-3">
      {!product.outOfStock && (
        <div className="flex items-center rounded-full border border-para-200 bg-white">
          <button
            type="button"
            onClick={() => setQty((q) => clamp(q - 1))}
            disabled={qty <= 1}
            aria-label="Diminuer la quantité"
            className="grid h-11 w-11 place-items-center rounded-l-full text-lg font-bold text-para-700 transition hover:bg-mint disabled:opacity-30"
          >
            −
          </button>
          <span aria-live="polite" className="w-10 text-center font-bold text-slate-800">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => clamp(q + 1))}
            disabled={product.maxStock >= 0 && qty >= product.maxStock}
            aria-label="Augmenter la quantité"
            className="grid h-11 w-11 place-items-center rounded-r-full text-lg font-bold text-para-700 transition hover:bg-mint disabled:opacity-30"
          >
            +
          </button>
        </div>
      )}

      <div id="product-add-to-cart-normal">
      <AddToCartButton
        className={`px-8 py-3.5 text-base ${product.outOfStock ? "pointer-events-none opacity-50" : ""}`}
        label={product.outOfStock ? "Indisponible" : "Ajouter au panier"}
        product={{
          productId: product.productId,
          slug: product.slug,
          name: product.name,
          imageUrl: product.imageUrl,
          price: product.price,
          maxStock: product.maxStock,
        }}
        quantity={qty}
      />
      </div>

      <FavoriteButton
        product={{
          productId: product.productId,
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          imageUrl: product.imageUrl,
          price: product.price,
          promoPrice: product.promoPrice,
          rating: product.rating,
          reviewsCount: product.reviewsCount,
        }}
        className="grid h-12 w-12 place-items-center rounded-full border border-para-200 bg-white transition hover:border-rose-300"
        iconClassName="h-5 w-5"
      />
    </div>
  );
}
