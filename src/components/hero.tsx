"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Leaf, PackageCheck, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { DELIVERY_CASABLANCA_H } from "@/lib/constants";

export type HeroStats = {
  /** Nombre de produits réellement publiés au catalogue. */
  productCount: number;
  /** Nombre de marques distinctes réellement présentes. */
  brandCount: number;
};

const IMAGE_BADGES = [
  { Icon: Truck, title: "Livraison 24h", detail: "à Casablanca", position: "right-4 top-4 sm:right-6 sm:top-6" },
  { Icon: PackageCheck, title: "Paiement à", detail: "la livraison", position: "left-4 top-[44%] sm:left-6" },
  { Icon: Sparkles, title: "Soins sélectionnés", detail: "avec expertise", position: "bottom-4 right-4 sm:bottom-6 sm:right-6" },
];

export function Hero({ stats }: { stats: HeroStats }) {
  const products = stats.productCount.toLocaleString("fr-FR");
  const brands = stats.brandCount.toLocaleString("fr-FR");

  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_82%_42%,rgba(233,193,180,0.24),transparent_34%),linear-gradient(135deg,#fbf7f3_0%,#f8f3ee_58%,#fdf9f5_100%)]">
      <div aria-hidden className="pointer-events-none absolute -left-40 top-16 h-96 w-96 rounded-full bg-white/60 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-40 bottom-0 h-[30rem] w-[30rem] rounded-full bg-[#e9c1b4]/15 blur-3xl" />

      <div className="relative mx-auto grid max-w-[1500px] items-center gap-10 px-5 pb-14 pt-10 sm:px-8 sm:pb-16 sm:pt-14 lg:grid-cols-[.78fr_1fr] lg:gap-14 lg:px-12 lg:pb-20 lg:pt-16 xl:grid-cols-[.8fr_1fr] xl:gap-20">
        <div className="relative z-10 max-w-[620px]">
          <p className="mb-6 inline-flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.28em] text-para-700 sm:text-[11px]">
            <span aria-hidden className="h-px w-9 bg-coral-600" />
            Beauté · santé · bien-être
          </p>

          <h1 className="max-w-[680px] font-display text-[clamp(3.25rem,6.6vw,6.25rem)] font-medium leading-[.94] tracking-[-0.045em] text-para-950">
            Prenez soin
            <br />
            de ce qui
            <br />
            <span className="text-para-700">compte.</span>
          </h1>

          <p className="mt-7 max-w-[600px] text-base leading-8 text-slate-600 sm:text-lg lg:text-[1.25rem] lg:leading-[1.65]">
            Une sélection experte de soins dermocosmétiques et de produits de parapharmacie,
            choisie pour accompagner chaque rituel de beauté au Maroc.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/recherche"
              className="btn-3d inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-para-800 px-7 py-3.5 font-semibold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-para-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-para-500"
            >
              Découvrir la boutique
              <ArrowRight size={17} strokeWidth={1.8} aria-hidden />
            </Link>
            <Link
              href="/nouveautes"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-para-300/80 bg-white/55 px-7 py-3.5 font-semibold text-para-800 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-para-500 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-para-500"
            >
              Nos nouveautés
            </Link>
          </div>

          <div className="mt-9 grid max-w-[600px] grid-cols-3 border-y border-para-200/80 py-4 text-para-800 sm:mt-10 sm:max-w-[620px] sm:py-5">
            {[
              { Icon: Leaf, label: "Produits sélectionnés" },
              { Icon: ShieldCheck, label: "Paiement sécurisé" },
              { Icon: Truck, label: `Livraison ${DELIVERY_CASABLANCA_H} à Casablanca` },
            ].map(({ Icon, label }, index) => (
              <div key={label} className={`flex min-w-0 items-center gap-2.5 px-2 first:pl-0 sm:gap-3 sm:px-4 ${index > 0 ? "border-l border-para-200/80" : ""}`}>
                <Icon className="h-4 w-4 shrink-0 text-coral-700 sm:h-[18px] sm:w-[18px]" strokeWidth={1.5} aria-hidden />
                <span className="text-[10px] font-medium leading-[1.25] text-para-800 sm:text-xs">{label}</span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs tracking-wide text-slate-500">
            {products} références · {brands} marques référencées
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-[820px] lg:min-w-0">
          <div aria-hidden className="absolute -right-5 -top-5 h-28 w-28 rounded-full border border-coral-300/50 sm:-right-8 sm:-top-8 sm:h-40 sm:w-40" />
          <div className="relative h-[420px] overflow-hidden rounded-[1.75rem] border-[6px] border-white/75 bg-[#f2e9e0] shadow-[0_28px_80px_-28px_rgba(18,63,54,0.35)] sm:h-[520px] sm:rounded-[2.25rem] lg:h-[650px] lg:rounded-[2.75rem]">
            <Image
              src="/images/premium/hero/hero-skincare-desktop.webp"
              alt="Produits de soin premium, feuillage et fleurs sur une composition en pierre naturelle"
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 58vw"
              className="object-cover object-center transition-transform duration-700 motion-safe:hover:scale-[1.015]"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-tr from-[#6e4f3b]/[0.06] via-transparent to-white/10" />

            {IMAGE_BADGES.map(({ Icon, title, detail, position }) => (
              <div
                key={title}
                className={`absolute ${position} flex items-center gap-2 rounded-[1.1rem] border border-white/80 bg-[#fffdf9]/85 px-3 py-2.5 text-para-900 shadow-[0_12px_30px_-16px_rgba(18,63,54,0.5)] backdrop-blur-md sm:gap-2.5 sm:rounded-[1.25rem] sm:px-4 sm:py-3`}
              >
                <Icon className="h-4 w-4 shrink-0 text-coral-700 sm:h-[18px] sm:w-[18px]" strokeWidth={1.45} aria-hidden />
                <span className="text-[10px] leading-[1.2] sm:text-xs">
                  <strong className="block font-semibold">{title}</strong>
                  <span className="text-para-700/75">{detail}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
