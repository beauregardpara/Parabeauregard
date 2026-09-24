"use client";

import { useState } from "react";
import type { CartItem } from "@/lib/cart-context";
import { useCart } from "@/lib/cart-context";

export function AddToCartButton({
  product,
  className = "",
  label = "Ajouter",
  quantity = 1,
}: {
  product: Omit<CartItem, "qty">;
  className?: string;
  label?: string;
  quantity?: number;
}) {
  const cart = useCart();
  const [added, setAdded] = useState(false);
  const outOfStock = product.maxStock === 0;

  if (outOfStock) {
    return (
      <span className={`block cursor-not-allowed rounded-full bg-slate-100 px-4 py-2 text-center text-xs font-bold text-slate-500 ${className}`}>
        Rupture de stock
      </span>
    );
  }

  return (
    <button
      onClick={() => {
        cart.add(product, quantity);
        setAdded(true);
        setTimeout(() => setAdded(false), 1200);
      }}
      className={`btn-3d btn-shine rounded-full bg-gradient-to-r from-para-500 to-para-700 font-semibold text-white shadow-soft transition hover:shadow-lift ${added ? "!from-emerald-500 !to-emerald-600" : ""} ${className}`}
    >
      {added ? "✓ Ajouté !" : label}
    </button>
  );
}