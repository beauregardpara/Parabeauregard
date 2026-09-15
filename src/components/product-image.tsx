"use client";

import Image from "next/image";
import { useState } from "react";
import { PackageX } from "lucide-react";
import { pickFallbackImage } from "@/lib/product-image";

type ProductImageProps = {
  src?: string | null;
  alt?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fallbackSeed?: string | null;
};

/**
 * Affiche une photo produit réelle avec un filet de secours (comme CarImage
 * du projet de référence) : si l'image ne charge pas, bascule vers une
 * illustration SVG thématique. Une photo cassée ne casse jamais l'UI.
 * Tous les fallbacks servis en "self" sont couverts par le CSP img-src.
 */
export default function ProductImage({
  src,
  alt = "",
  fill,
  width,
  height,
  className,
  sizes,
  priority,
  fallbackSeed,
}: ProductImageProps) {
  const [current] = useState<string | undefined>(src ?? undefined);
  const [failed, setFailed] = useState(false);
  const fallback = pickFallbackImage(fallbackSeed ?? alt ?? "");

  if (!current || failed) {
    return <div className="premium-product-fallback absolute inset-0 grid place-items-center bg-gradient-to-br from-[#f7fbfa] via-[#e7f7f4] to-[#f6efe5] p-4 text-center" role="img" aria-label={`${alt} — visuel indisponible`}><div className="flex flex-col items-center gap-2 text-para-800"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/85 text-para-600 shadow-sm ring-1 ring-para-100"><PackageX size={28} strokeWidth={1.6} /></span><span className="font-display text-sm font-semibold">Visuel indisponible</span><span className="text-[10px] uppercase tracking-[0.18em] text-para-600/70">Para Beauregard</span></div></div>;
  }

  return (
    <Image
      src={current ?? fallback}
      alt={alt}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={className}
      sizes={sizes}
      priority={priority}
      unoptimized
      onError={() => {
        setFailed(true);
      }}
    />
  );
}
