import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { Hero } from "@/components/hero";
import { Reveal, TiltCard, CountUp } from "@/components/motion";
import { ProductCard } from "@/components/product-card";
import { RecentlyViewedSection } from "@/components/recently-viewed-section";
import { FREE_SHIPPING_THRESHOLD_DH, RETURN_DAYS } from "@/lib/constants";
import { slugify } from "@/lib/format";
import { AssistantCta } from "@/components/assistant-cta";

export const revalidate = 60;

export default async function HomePage() {
  const [parents, featured, promos, news, productCount, topBrandRows, brandRows, testimonials] = await Promise.all([
    db.category.findMany({ where: { parentId: null, visible: true }, orderBy: { order: "asc" }, take: 8 }),
    db.product.findMany({
      where: { status: "PUBLISHED" },
      // Mise en avant éditoriale d'abord, puis les meilleures ventes réelles.
      orderBy: [{ isFeatured: "desc" }, { soldCount: "desc" }, { id: "asc" }],
      take: 8,
      include: { images: { orderBy: { order: "asc" }, take: 1 } },
    }),
    db.product.findMany({
      where: { status: "PUBLISHED", promoPrice: { not: null } },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: { images: { orderBy: { order: "asc" }, take: 1 } },
    }),
    db.product.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { images: { orderBy: { order: "asc" }, take: 1 } },
    }),
    db.product.count({ where: { status: "PUBLISHED" } }),
    // Marques réellement présentes, les mieux fournies d'abord.
    db.product.groupBy({
      by: ["brand"],
      where: { status: "PUBLISHED", brand: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { brand: "desc" } },
      take: 10,
    }),
    db.product.findMany({
      where: { status: "PUBLISHED", brand: { not: null } },
      select: { brand: true },
      distinct: ["brand"],
    }),
    // Témoignages : uniquement de vrais avis approuvés en base.
    db.review.findMany({
      where: { status: "APPROVED", comment: { not: null }, rating: { gte: 4 } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, author: true, rating: true, comment: true, verifiedPurchase: true },
    }),
  ]);

  const brandCount = brandRows.length;
  const topBrands = topBrandRows.map((r) => r.brand).filter((b): b is string => Boolean(b));
  const universeImages: Record<string, string> = {
    "soins-visage": "/images/premium/univers/face.webp",
    "soins-cheveux": "/images/premium/univers/hair.webp",
    "hygiene-corps": "/images/premium/univers/body.webp",
    "bebe-maman": "/images/premium/univers/baby.webp",
    "nature-bien-etre": "/images/premium/univers/wellness.webp",
    hommes: "/images/premium/univers/men.webp",
  };

  return (
    <>
      <Hero stats={{ productCount, brandCount }} />

      {/* Catégories */}
      {parents.length > 0 && <section className="mx-auto max-w-7xl px-4 py-16">
        <Reveal className="mb-8 text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-para-500">Nos univers</p>
          <h2 className="mt-1 font-display text-3xl font-extrabold text-para-950">Le soin, dans toutes ses dimensions</h2>
        </Reveal>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {parents.map((c, i) => (
            <Reveal key={c.id} delay={(i % 4) as 0 | 1 | 2 | 3}>
              <TiltCard>
                <Link href={`/categories/${c.slug}`}
                  className="glow-border group relative block overflow-hidden rounded-3xl border border-para-100 bg-gradient-to-br from-white to-mint shadow-sm">
                  <div className="relative aspect-[4/3] overflow-hidden bg-mint">
                    {universeImages[c.slug] || c.imageUrl ? (
                      <Image src={universeImages[c.slug] || c.imageUrl!} alt={c.name} fill sizes="(max-width:640px) 45vw, 280px" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center text-6xl transition-transform duration-500 group-hover:scale-125 group-hover:-rotate-6">{c.icon ?? "🧴"}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <h3 className="font-display text-sm font-bold text-para-900 sm:text-base">{c.name}</h3>
                    <span className="text-para-500 transition-transform duration-300 group-hover:translate-x-1.5">→</span>
                  </div>
                </Link>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>}

      {/* Bandeau chiffres animés */}
      <section className="mx-auto max-w-7xl px-4 pb-4">
        <Reveal>
          <div className="shadow-deep relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-para-800 via-para-700 to-para-950 px-6 py-10 text-white sm:px-12">
            <div aria-hidden className="aurora opacity-40" />
            <dl className="relative grid grid-cols-2 gap-8 text-center md:grid-cols-4">
              {[
                { v: productCount, suffix: "", label: "références au catalogue", d: 0 },
                { v: brandCount, suffix: "", label: "marques référencées", d: 0 },
                { v: FREE_SHIPPING_THRESHOLD_DH, suffix: " DH", label: "livraison offerte dès", d: 0 },
                { v: RETURN_DAYS, suffix: " j", label: "pour changer d'avis", d: 0 },
              ].map((s) => (
                <div key={s.label}>
                  <dd className="font-display text-3xl font-extrabold text-white sm:text-4xl">
                    <CountUp to={s.v} suffix={s.suffix} decimals={s.d} />
                  </dd>
                  <dt className="mt-1 text-xs font-semibold uppercase tracking-wide text-para-100/80 sm:text-sm">{s.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </section>

      {/* Best-sellers */}
      {featured.length > 0 && (
        <section className="bg-mint/50 py-16">
          <div className="mx-auto max-w-7xl px-4">
            <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-para-500">Les préférés de nos clients</p>
                <h2 className="mt-1 font-display text-3xl font-extrabold text-para-950">Best-sellers</h2>
              </div>
              <Link href="/nouveautes" className="text-sm font-bold text-para-700 hover:text-para-900">Tout voir →</Link>
            </Reveal>
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
              {featured.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) as 0 | 1 | 2 | 3}>
                  <ProductCard p={{ ...p, imageUrl: p.images[0]?.url ?? null }} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Promotions */}
      {promos.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-coral-600">Offres limitées</p>
              <h2 className="mt-1 font-display text-3xl font-extrabold text-para-950">Promotions du moment</h2>
            </div>
            <Link href="/promotions" className="text-sm font-bold text-coral-600 hover:text-coral-600/80">Toutes les promos →</Link>
          </Reveal>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {promos.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) as 0 | 1 | 2 | 3}>
                <ProductCard p={{ ...p, imageUrl: p.images[0]?.url ?? null }} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Nouveautés */}
      {news.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16">
          <Reveal className="mb-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-para-500">Fraîchement arrivés</p>
            <h2 className="mt-1 font-display text-3xl font-extrabold text-para-950">Nouveautés</h2>
          </Reveal>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {news.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) as 0 | 1 | 2 | 3}>
                <ProductCard p={{ ...p, imageUrl: p.images[0]?.url ?? null }} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <RecentlyViewedSection />

      {/* Marques */}
      {topBrands.length > 0 && <section className="overflow-hidden border-y border-para-100 bg-white py-10">
        <p className="mb-6 text-center text-xs font-extrabold uppercase tracking-[0.25em] text-slate-400">
          Les marques que nous aimons
        </p>
        <div className="marquee-track gap-14 pr-14">
          {[...Array(2)].flatMap((_, k) =>
            topBrands.map((b) => (
              <Link
                key={`${k}-${b}`}
                href={`/marques/${slugify(b)}`}
                aria-hidden={k === 1 ? true : undefined}
                tabIndex={k === 1 ? -1 : undefined}
                className="whitespace-nowrap font-display text-xl font-bold text-para-900/25 transition hover:text-para-700"
              >
                {b}
              </Link>
            ))
          )}
        </div>
      </section>}

      {/* Bandeau assistant IA */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <Reveal>
          <div className="scene">
            <div className="preserve-3d card-3d mesh-bg relative overflow-hidden rounded-[2rem] border border-para-100 p-8 shadow-soft sm:p-12">
              <div aria-hidden className="blob absolute -right-20 -top-20 h-72 w-72 bg-coral-400/30" />
              <div id="assistant" className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_.9fr]">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-coral-600">Votre conseillère beauté</p>
                  <h2 className="mt-2 font-display text-2xl font-extrabold text-para-950 sm:text-3xl">
                    Une question sur votre routine ?
                  </h2>
                  <p className="mt-3 text-slate-600">
                    Notre assistant vous aide à trouver les produits adaptés à vos besoins, à partir des données réelles du catalogue.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {["Peau sensible", "Hydratation", "Solaire", "Cheveux", "Bébé"].map((suggestion) => (
                      <span key={suggestion} className="rounded-full border border-para-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-para-700">{suggestion}</span>
                    ))}
                  </div>
                  <div className="mt-6"><AssistantCta /></div>
                </div>

                {/* Visuel éditorial local de l'assistant : pas d'URL distante. */}
                <div className="preserve-3d relative hidden overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/60 shadow-lift lg:block" aria-hidden>
                  <Image src="/images/premium/assistant/assistant-beaute-premium.webp" alt="" width={900} height={900} className="h-72 w-full object-cover" />
                  <div className="absolute bottom-4 left-4 rounded-2xl bg-white/90 px-4 py-3 text-sm text-para-900 shadow-soft backdrop-blur">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-coral-600">Conseil personnalisé</span>
                    Votre rituel, pensé avec soin.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Témoignages — uniquement de vrais avis approuvés (aucun avis inventé). */}
      {testimonials.length > 0 && (
        <section className="bg-mint/50 py-16">
          <div className="mx-auto max-w-7xl px-4">
            <Reveal className="mb-8 text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-para-500">Ils nous font confiance</p>
              <h2 className="mt-1 font-display text-3xl font-extrabold text-para-950">Avis de nos clients</h2>
              <p className="mt-2 text-sm text-slate-500">
                Avis publiés après modération par notre équipe.
              </p>
            </Reveal>
            <div className="grid gap-5 md:grid-cols-3">
              {testimonials.map((t, i) => (
                <Reveal key={t.id} delay={(i % 3) as 0 | 1 | 2}>
                  <TiltCard intensity={7}>
                    <figure className="shine-card relative flex h-full flex-col rounded-3xl border border-para-100 bg-white p-6 shadow-sm">
                      <p className="text-sm text-amber-500" role="img" aria-label={`${t.rating} étoiles sur 5`}>
                        <span aria-hidden>
                          {"★".repeat(t.rating)}
                          <span className="text-slate-300">{"★".repeat(5 - t.rating)}</span>
                        </span>
                      </p>
                      <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">« {t.comment} »</blockquote>
                      <figcaption className="mt-4 flex items-center gap-3 border-t border-para-50 pt-4">
                        <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-para-100 to-mint font-display font-extrabold text-para-700">
                          {t.author.charAt(0).toUpperCase()}
                        </span>
                        <span>
                          <strong className="block text-sm text-para-900">{t.author}</strong>
                          {t.verifiedPurchase && (
                            <span className="text-xs text-slate-400">Achat vérifié ✓</span>
                          )}
                        </span>
                      </figcaption>
                    </figure>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

    </>
  );
}
