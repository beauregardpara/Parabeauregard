import Link from "next/link";
import ProductImage from "@/components/product-image";
import { formatPrice } from "@/lib/format";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { CompareButton } from "@/components/compare-button";
import { FavoriteButton } from "@/components/favorite-button";

export type ProductCardData = {
  id: number;
  name: string;
  slug: string;
  brand: string | null;
  price: number;
  promoPrice: number | null;
  stock: number;
  unlimitedStock: boolean;
  imageUrl?: string | null;
  avgRating?: number | null;
  reviewsCount?: number;
  isNew?: boolean;
  createdAt?: Date | string;
};

export function ProductCard({ p }: { p: ProductCardData }) {
  const discount =
    p.promoPrice && p.promoPrice < p.price
      ? Math.round(((p.price - p.promoPrice) / p.price) * 100)
      : null;
  const lowStock = !p.unlimitedStock && p.stock > 0 && p.stock <= 3;

  const showNew = Boolean(p.isNew);

  return (
    <article className="card-3d shine-card group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-para-200/70 bg-[#fffdfb] shadow-[var(--shadow-card)] transition-shadow hover:shadow-lift">
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
        {discount !== null && <span className="badge-promo rounded-full px-2.5 py-1 text-[11px] font-extrabold text-white">-{discount}%</span>}
        {showNew && (
          <span className="badge-new rounded-full px-2.5 py-1 text-[11px] font-bold text-white">
            Nouveau
          </span>
        )}
      </div>

      <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-1.5">
        <FavoriteButton
          product={{
            productId: p.id,
            slug: p.slug,
            name: p.name,
            brand: p.brand,
            imageUrl: p.imageUrl ?? null,
            price: p.price,
            promoPrice: p.promoPrice,
            rating: p.avgRating ?? null,
            reviewsCount: p.reviewsCount ?? 0,
          }}
          className="rounded-full border border-white/70 bg-white/90 p-1.5 shadow-sm backdrop-blur"
          iconClassName="h-[15px] w-[15px]"
        />
        <CompareButton
          iconOnly
          product={{ id: p.id, slug: p.slug, name: p.name, brand: p.brand, imageUrl: p.imageUrl ?? null, price: p.price, promoPrice: p.promoPrice }}
          className="rounded-full border border-white/70 bg-white/90 p-1.5 shadow-sm backdrop-blur"
        />
      </div>

      <Link href={`/produits/${p.slug}`} className="card-media zoom-frame relative block aspect-square overflow-hidden bg-gradient-to-br from-[#f8fbf6] to-para-100">
        <ProductImage
          src={p.imageUrl}
          alt={p.name}
          fill
          fallbackSeed={p.name}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 260px"
          className="card-3d-img object-contain p-5 sm:p-7"
        />
        <span className="glare rounded-none" aria-hidden />
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-4 pt-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-para-600">{p.brand}</p>
        <Link href={`/produits/${p.slug}`} className="line-clamp-2 min-h-[2.6rem] text-sm font-semibold leading-snug text-para-950 transition hover:text-coral-600">
          {p.name}
        </Link>

        {typeof p.avgRating === "number" && p.reviewsCount ? (
          <p className="text-xs text-amber-500" aria-label={`Note ${p.avgRating.toFixed(1)} sur 5`}>
            {"★".repeat(Math.round(p.avgRating))}
            <span className="text-slate-300">{"★".repeat(5 - Math.round(p.avgRating))}</span>
            <span className="ml-1 text-slate-500">({p.reviewsCount})</span>
          </p>
        ) : null}

        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className={`rounded-full px-2.5 py-0.5 font-display text-lg font-extrabold ${discount !== null ? "bg-coral-50 text-coral-600" : "bg-para-50 text-para-800"}`}>
            {formatPrice(p.promoPrice ?? p.price)}
          </span>
          {discount !== null && <span className="text-sm text-slate-500 line-through">{formatPrice(p.price)}</span>}
        </div>

        {lowStock && <p className="text-[11px] font-semibold text-coral-600">⚡ Plus que {p.stock} en stock</p>}
        {!p.unlimitedStock && p.stock <= 0 && <p className="text-[11px] font-semibold text-slate-500">Indisponible</p>}

        <AddToCartButton
          className="mt-2 w-full px-4 py-2.5 text-sm"
          product={{
            productId: p.id,
            slug: p.slug,
            name: p.name,
            imageUrl: p.imageUrl ?? null,
            price: p.promoPrice ?? p.price,
            maxStock: p.unlimitedStock ? -1 : p.stock,
          }}
        />
      </div>
    </article>
  );
}
