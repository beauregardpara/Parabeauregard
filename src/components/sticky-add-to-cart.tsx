"use client";

import { AddToCartButton } from "@/components/add-to-cart-button";
import { FavoriteButton } from "@/components/favorite-button";
import { useEffect, useRef, useState } from "react";

export function StickyAddToCart({
  product,
  outOfStock,
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
    maxStock: number;
  };
  outOfStock: boolean;
}) {
  const [active, setActive] = useState(false);
  const hasScrolled = useRef(false);
  useEffect(() => {
    const target = document.getElementById("product-add-to-cart-normal");
    if (!target) return;
    const update = () => {
      const rect = target.getBoundingClientRect();
      const visible = rect.top < window.innerHeight && rect.bottom > 0;
      setActive(hasScrolled.current && !visible);
    };
    const onScroll = () => {
      if (window.scrollY > 8) hasScrolled.current = true;
      update();
    };
    const observer = new IntersectionObserver(([entry]) => {
      setActive(hasScrolled.current && !entry.isIntersecting);
    }, { threshold: 0.1 });
    observer.observe(target);
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return (
    <div data-product-sticky-cta data-active={active ? "true" : "false"} aria-hidden={!active} className={`fixed inset-x-0 bottom-[calc(var(--bottom-nav-height)+var(--safe-bottom)+var(--product-sticky-gap))] z-[65] flex items-center gap-2 border-t border-para-100 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgba(1,90,181,.25)] backdrop-blur lg:hidden ${active ? "translate-y-0" : "pointer-events-none translate-y-full invisible"}`}>
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
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-para-200 bg-white"
        iconClassName="h-5 w-5"
      />
      <AddToCartButton
        className={`w-full py-3.5 text-base ${outOfStock ? "pointer-events-none opacity-50" : ""}`}
        label={outOfStock ? "Indisponible" : "Ajouter au panier"}
        product={{
          productId: product.productId,
          slug: product.slug,
          name: product.name,
          imageUrl: product.imageUrl,
          price: product.price,
          maxStock: product.maxStock,
        }}
      />
    </div>
  );
}
