import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Send } from "lucide-react";
import { db } from "@/lib/db";
import { Hero } from "@/components/hero";
import { Reveal } from "@/components/motion";
import { ProductCard } from "@/components/product-card";
import { AssistantCta } from "@/components/assistant-cta";

export const metadata: Metadata = { alternates: { canonical: "/" } };
export const revalidate = 60;

// Chaque vignette est composee de vrais packshots du catalogue
// (scripts/univers-selection.mjs puis scripts/univers-vignettes.mjs).
const UNIVERS = [
  { href: "/categories/soins-visage", label: "Soins visage", image: "/images/premium/univers/soins-visage-produits.webp" },
  { href: "/recherche?q=soins%20corps", label: "Soins corps", image: "/images/premium/univers/soins-corps-produits.webp" },
  { href: "/categories/soins-cheveux", label: "Cheveux", image: "/images/premium/univers/soins-cheveux-produits.webp" },
  { href: "/categories/bebe-maman", label: "Bébé & Maman", image: "/images/premium/univers/bebe-maman-produits.webp" },
  { href: "/categories/hygiene-corps", label: "Hygiène", image: "/images/premium/univers/hygiene-corps-produits.webp" },
  { href: "/recherche?q=compléments", label: "Compléments", image: "/images/premium/univers/complements-produits.webp" },
  { href: "/recherche?q=solaire", label: "Solaire", image: "/images/premium/univers/solaire-produits.webp" },
  { href: "/recherche?q=homme", label: "Hommes", image: "/images/premium/univers/hommes-produits.webp" },
  { href: "/recherche?q=nature%20bio", label: "Nature & Bio", image: "/images/premium/univers/nature-bio-produits.webp" },
  { href: "/marques", label: "Nos marques", image: "/images/premium/univers/marques-produits.webp" },
] as const;

export default async function HomePage() {
  const [featuredRows, promoRows, productCount, brandRows] = await Promise.all([
    db.product.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ isFeatured: "desc" }, { soldCount: "desc" }, { id: "asc" }],
      take: 6,
      include: {
        images: { orderBy: { order: "asc" }, take: 1 },
        reviews: { where: { status: "APPROVED" }, select: { rating: true } },
      },
    }),
    db.product.findMany({
      where: { status: "PUBLISHED", promoPrice: { not: null } },
      orderBy: { updatedAt: "desc" },
      take: 24,
      include: { images: { orderBy: { order: "asc" }, take: 1 } },
    }),
    db.product.count({ where: { status: "PUBLISHED" } }),
    db.product.findMany({ where: { status: "PUBLISHED", brand: { not: null } }, select: { brand: true }, distinct: ["brand"] }),
  ]);

  const brandCount = brandRows.length;
  const featured = featuredRows.map(({ reviews, ...product }) => ({
    ...product,
    avgRating: reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null,
    reviewsCount: reviews.length,
  }));
  const solaire = promoRows.find((product) => /solaire|spf|sun|soleil/i.test(product.name)) ?? promoRows[0] ?? null;
  const remiseSolaire = solaire?.promoPrice && solaire.promoPrice < solaire.price
    ? Math.round((1 - solaire.promoPrice / solaire.price) * 100)
    : 0;

  return (
    <>
      <Hero stats={{ productCount, brandCount }} />

      <section aria-label="Nos univers" className="border-y border-para-100/80 bg-[#f6f2e8]">
        <div className="container-page flex gap-5 overflow-x-auto py-6 xl:justify-between xl:overflow-visible">
          {UNIVERS.map((universe) => (
            <Link key={universe.label} href={universe.href} className="group flex w-[88px] shrink-0 flex-col items-center gap-2 text-center">
              <span className="grid h-[74px] w-[74px] place-items-center overflow-hidden rounded-full bg-[#f2ecdf] shadow-sm ring-1 ring-para-200/60 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lift">
                <Image src={universe.image} alt="" width={148} height={148} sizes="74px" className="h-full w-full object-cover" />
              </span>
              <span className="text-[12px] font-medium leading-tight text-para-950">{universe.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="Nos sélections" className="container-page grid gap-4 py-7 md:grid-cols-3">
        <Reveal>
          <article className="relative h-[210px] overflow-hidden rounded-[1.65rem] bg-[#e9ebd9] shadow-sm">
            <Image src="/images/premium/hero/botanical-scene.webp" alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover opacity-55" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#edf0df] via-[#edf0df]/95 to-transparent" />
            <div className="relative z-10 max-w-[60%] p-6">
              <h2 className="font-display text-[22px] leading-[1.05] text-para-950">Nos soins solaires</h2>
              <p className="mt-1 text-sm text-para-900">pour un été en toute sérénité</p>
              {remiseSolaire > 0 && <p className="mt-3 font-display text-[38px] leading-none text-para-950">-{remiseSolaire}%</p>}
              <Link href="/recherche?q=solaire" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-para-800 px-5 text-xs font-semibold text-white hover:bg-para-900">Voir la sélection <ArrowRight size={14} aria-hidden /></Link>
            </div>
            {solaire?.images[0]?.url && <Image src={solaire.images[0].url} alt={solaire.name} width={260} height={300} sizes="180px" className="absolute bottom-0 right-1 h-[88%] w-[45%] object-contain drop-shadow-xl" />}
          </article>
        </Reveal>

        <Reveal delay={1}>
          <article className="relative h-[210px] overflow-hidden rounded-[1.65rem] bg-[#e8eadf] shadow-sm">
            <Image src="/images/premium/campaign/healthy-skin.webp" alt="Femme appliquant un soin du visage" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#f5f1e7] via-[#f5f1e7]/88 to-transparent" />
            <div className="relative z-10 max-w-[58%] p-6">
              <h2 className="font-display text-[22px] leading-[1.05] text-para-950">Une peau plus saine<br />dès aujourd&apos;hui</h2>
              <p className="mt-3 text-xs leading-relaxed text-para-900">Découvrez notre sélection dermocosmétique</p>
              <Link href="/categories/soins-visage" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-para-800 px-5 text-xs font-semibold text-white hover:bg-para-900">Découvrir <ArrowRight size={14} aria-hidden /></Link>
            </div>
          </article>
        </Reveal>

        <Reveal delay={2}>
          <article className="relative h-[210px] overflow-hidden rounded-[1.65rem] bg-[#f5e7dc] shadow-sm">
            <Image src="/images/premium/campaign/maman-bebe.webp" alt="Bébé souriant enveloppé dans une serviette" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#fbf1e8] via-[#fbf1e8]/90 to-transparent" />
            <div className="relative z-10 max-w-[58%] p-6">
              <h2 className="font-display text-[22px] leading-tight text-coral-800">Maman &amp; Bébé</h2>
              <p className="mt-3 text-xs leading-relaxed text-para-900">Tout le nécessaire pour leur bien-être au quotidien</p>
              <Link href="/categories/bebe-maman" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-para-800 px-5 text-xs font-semibold text-white hover:bg-para-900">Voir la sélection <ArrowRight size={14} aria-hidden /></Link>
            </div>
          </article>
        </Reveal>
      </section>

      {featured.length > 0 && (
        <section className="container-page pb-8 pt-2">
          <Reveal className="mb-5 flex items-end justify-between gap-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.28em] text-para-600">Nos produits phares</p><h2 className="mt-1 font-display text-3xl leading-tight text-para-950">Les incontournables de nos clients</h2></div>
            <Link href="/nouveautes" className="shrink-0 text-xs font-semibold text-para-800 hover:text-para-950">Tout voir →</Link>
          </Reveal>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {featured.map((product, index) => (
              <Reveal key={product.id} delay={(index % 4) as 0 | 1 | 2 | 3}><ProductCard p={{ ...product, imageUrl: product.images[0]?.url ?? null }} /></Reveal>
            ))}
          </div>
        </section>
      )}

      <section className="container-page py-7">
        <Reveal>
          <div id="assistant" className="relative isolate min-h-[250px] overflow-hidden rounded-[1.8rem] bg-[#f3efe4] shadow-sm">
            <Image src="/images/premium/campaign/pharmacienne.webp" alt="Pharmacienne Para Beauregard" fill sizes="100vw" className="-z-20 object-cover object-left" />
            <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,transparent_0%,rgba(246,242,232,.82)_32%,rgba(246,242,232,.96)_58%,rgba(246,242,232,.88)_100%)]" />
            <div className="grid min-h-[250px] items-center gap-6 p-6 md:grid-cols-[220px_1fr_300px] lg:grid-cols-[280px_1fr_330px] lg:p-8">
              <div aria-hidden />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-para-600">Un doute ? Une question ?</p>
                <h2 className="mt-2 font-display text-2xl leading-[1.05] text-para-950 lg:text-3xl">Nos pharmaciens vous conseillent en temps réel</h2>
                <ul className="mt-4 grid gap-2 text-xs text-para-900">
                  {["Conseils personnalisés", "Recommandations adaptées à votre peau", "Réponse rapide via notre chat"].map((item) => <li key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-para-700" aria-hidden />{item}</li>)}
                </ul>
                <div className="mt-5"><AssistantCta /></div>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-lift backdrop-blur-sm" aria-hidden>
                <div className="flex items-center gap-2.5"><span className="relative h-8 w-8 overflow-hidden rounded-full bg-para-100"><Image src="/images/premium/campaign/pharmacienne.webp" alt="" fill sizes="32px" className="object-cover object-left" /></span><span className="text-[11px] leading-tight"><strong className="block text-para-950">Conseillère Para Beauregard</strong><span className="text-para-600">● En ligne</span></span></div>
                <p className="mt-3 rounded-2xl rounded-bl-sm bg-para-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-para-900">Bonjour ! Comment puis-je vous aider aujourd&apos;hui ?</p>
                <div className="mt-3 flex items-center gap-2 rounded-full border border-para-200 bg-white py-1.5 pl-4 pr-1.5"><span className="flex-1 text-[11px] text-para-900/70">Posez votre question…</span><span className="grid h-7 w-7 place-items-center rounded-full bg-para-800 text-white"><Send size={12} aria-hidden /></span></div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
