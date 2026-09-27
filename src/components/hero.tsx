"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, HeartHandshake, Truck } from "lucide-react";

export type HeroStats = {
  /** Nombre de produits réellement publiés au catalogue. */
  productCount: number;
  /** Nombre de marques distinctes réellement présentes. */
  brandCount: number;
};

const GARANTIES = [
  { Icon: BadgeCheck, ligne1: "Produits authentiques", ligne2: "et certifiés" },
  { Icon: Truck, ligne1: "Livraison rapide", ligne2: "dans tout le Maroc" },
  { Icon: HeartHandshake, ligne1: "Conseils de", ligne2: "pharmaciens experts" },
];

export function Hero({ stats }: { stats: HeroStats }) {
  const references = stats.productCount.toLocaleString("fr-FR");
  const marques = stats.brandCount.toLocaleString("fr-FR");

  return (
    <section className="relative isolate overflow-hidden bg-[#dfe6cf]">
      <Image
        src="/images/premium/hero/botanical-scene.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-center"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(246,242,232,.96)_0%,rgba(246,242,232,.88)_34%,rgba(246,242,232,.26)_61%,rgba(19,48,28,.08)_100%)]" />

      <div className="relative mx-auto grid min-h-[510px] max-w-[1500px] items-center gap-6 px-5 py-10 sm:px-8 md:grid-cols-[.92fr_1.08fr] md:gap-3 lg:gap-8 lg:px-14 lg:py-14">
        <div className="max-w-[540px]">
          <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-para-800 sm:text-[11px]">
            Beauté · Santé · Bien-être
          </p>

          <h1 className="mt-4 font-display text-[clamp(2.4rem,5vw,3.6rem)] font-normal leading-[1.06] text-para-950">
            La parapharmacie
            <br />
            dont votre peau
            <br />
            se souvient.
          </h1>

          <p className="mt-5 max-w-[440px] text-sm leading-[1.75] text-para-900/90 sm:text-[15px]">
            Des soins dermocosmétiques d&apos;exception, une sélection experte et des conseils
            personnalisés pour toute la famille, au Maroc.
          </p>

          <div className="relative mt-3 h-[175px] sm:h-[225px] md:hidden">
            <div aria-hidden className="absolute inset-x-[8%] bottom-[2%] h-6 rounded-full bg-para-950/25 blur-xl" />
            <Image
              src="/images/premium/hero/hero-produits-v2.png"
              alt="Sélection de soins dermocosmétiques Para Beauregard"
              fill
              priority
              sizes="(max-width: 639px) 94vw, 88vw"
              className="scale-[1.08] object-contain object-bottom drop-shadow-[0_16px_18px_rgba(19,48,28,.26)]"
            />
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/recherche"
              className="group inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full bg-para-800 px-7 py-3 font-semibold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-para-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-para-900"
            >
              Découvrir nos produits
              <ArrowRight size={16} strokeWidth={2} aria-hidden className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/marques"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 py-3 font-semibold text-para-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-para-900"
            >
              Nos marques
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-4">
            {GARANTIES.map(({ Icon, ligne1, ligne2 }) => (
              <li key={ligne1} className="flex items-center gap-2.5 text-[11px] leading-[1.35] text-para-900">
                <Icon className="h-5 w-5 shrink-0 text-para-800" strokeWidth={1.4} aria-hidden />
                <span>
                  {ligne1}
                  <br />
                  {ligne2}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-7 text-xs text-para-900/70">
            {references} références · {marques} marques référencées
          </p>
        </div>

        <div className="relative hidden h-[430px] md:block lg:h-[470px]">
          <p
            aria-hidden
            className="absolute right-2 top-1 hidden h-[132px] w-[132px] flex-col items-center justify-center rounded-full border border-white/60 bg-para-950/90 text-center text-[8px] uppercase leading-[1.9] tracking-[0.16em] text-para-100 shadow-xl sm:flex lg:right-4"
          >
            Le pouvoir
            <br />
            de la nature
            <br />
            au service
            <br />
            de votre peau
          </p>

          {/* Ombre au sol, qui pose les flacons sur la scène. */}
          <div aria-hidden className="absolute inset-x-[3%] bottom-[3%] h-8 rounded-full bg-para-950/30 blur-xl" />

          <Image
            src="/images/premium/hero/hero-produits-v2.png"
            alt="Sélection de soins dermocosmétiques Para Beauregard"
            fill
            priority
            sizes="(max-width: 639px) 92vw, (max-width: 767px) 85vw, 52vw"
            className="scale-[1.08] object-contain object-bottom drop-shadow-[0_20px_22px_rgba(19,48,28,.28)] sm:scale-110 md:scale-[1.16]"
          />
        </div>
      </div>
    </section>
  );
}
