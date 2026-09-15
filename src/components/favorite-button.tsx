"use client";

import { useFavorites, type FavoriteItem } from "@/lib/favorites-context";

export function FavoriteButton({
  product,
  className = "",
  iconClassName = "",
}: {
  product: FavoriteItem;
  className?: string;
  iconClassName?: string;
}) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(product.productId);

  return (
    <button
      type="button"
      onClick={() => toggle(product)}
      aria-pressed={active}
      aria-label={active ? "Retirer des favoris" : "Ajouter aux favoris"}
      title={active ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={`${className} flex items-center justify-center transition hover:scale-105`}
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden
        className={`${iconClassName} transition ${
          active ? "fill-rose-500 text-rose-500" : "fill-transparent text-slate-500 hover:text-rose-500"
        }`}
      >
        <path
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
        />
      </svg>
    </button>
  );
}