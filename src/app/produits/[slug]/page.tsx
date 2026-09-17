import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getProductBySlug } from "@/lib/search";
import { getSimilarProducts, getPopularProducts } from "@/lib/recommendations";
import { discountPercent, formatPrice } from "@/lib/format";
import {
  DELIVERY_CASABLANCA_H,
  DELIVERY_OTHER_H,
  FREE_SHIPPING_THRESHOLD_DH,
} from "@/lib/constants";
import { ProductCard } from "@/components/product-card";
import { ProductPurchasePanel } from "@/components/product-purchase-panel";
import { StockAlertForm } from "@/components/stock-alert-form";
import { PriceChart } from "@/components/price-chart";
import { TrackRecentlyViewed } from "@/components/track-recently-viewed";
import { RecentlyViewedSection } from "@/components/recently-viewed-section";
import { StickyAddToCart } from "@/components/sticky-add-to-cart";
import { Gallery } from "@/components/gallery";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { cleanDescription } from "@/lib/product-description";
import { ReputationSection } from "@/components/reputation-section";
import { getProductReputation } from "@/lib/reputation";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  // Never derive public metadata (title, description, OpenGraph) from a product
  // that is not published: the storefront must behave as if it does not exist.
  if (!p || p.status !== "PUBLISHED") notFound();
  return {
    title: p.name,
    description: p.shortDescription ?? p.description?.slice(0, 160) ?? `Achetez ${p.name} au meilleur prix au Maroc.`,
    alternates: { canonical: `/produits/${slug}` },
    openGraph: { images: p.images[0]?.url ? [p.images[0].url] : [] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p || p.status !== "PUBLISHED") notFound();

  // Incrément des vues (best-effort)
  db.product.update({ where: { id: p.id }, data: { viewsCount: { increment: 1 } } }).catch(() => {});

  const price = p.promoPrice && p.promoPrice < p.price ? p.promoPrice : p.price;
  const discount = discountPercent(p.price, p.promoPrice);
  const inStock = p.unlimitedStock || p.stock > 0;
  const lowStock = !p.unlimitedStock && p.stock > 0 && p.stock <= p.lowStockThreshold;
  const isNew = Boolean(p.isNew);
  const shortDescription = cleanDescription(p.shortDescription);
  const avgRating =
    p.reviews.length > 0 ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length : null;

  const similar = await getSimilarProducts(p.id, p.categoryId, p.brand, p.slug);
  const popular =
    similar.length < 4
      ? (await getPopularProducts(4)).filter((r) => r.id !== p.id).slice(0, 4)
      : [];

  const priceHistory = await db.priceHistory.findMany({
    where: { productId: p.id },
    orderBy: { changedAt: "asc" },
    take: 30,
    select: { newPrice: true, changedAt: true },
  });
  const reputation = await getProductReputation(p.id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.shortDescription ?? p.description ?? "",
    image: p.images.map((i) => i.url),
    sku: p.sku ?? String(p.id),
    brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "MAD",
      price,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(avgRating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: avgRating.toFixed(1),
            reviewCount: p.reviews.length,
          },
        }
      : {}),
  };

  // Safe JSON-LD: escape </script> sequences to prevent XSS
  const safeJsonLd = JSON.stringify(jsonLd).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");

  const crumbs: { name: string; href: string }[] = [
    { name: "Accueil", href: "/" },
  ];
  if (p.category?.parent) {
    crumbs.push({ name: p.category.parent.name, href: `/categories/${p.category.parent.slug}` });
  }
  if (p.category) {
    crumbs.push({ name: p.category.name, href: `/categories/${p.category.slug}` });
  }
  crumbs.push({ name: p.name, href: `/produits/${p.slug}` });

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://para-beauregard.vercel.app"}${c.href}`,
    })),
  };
  const safeBreadcrumbJsonLd = JSON.stringify(breadcrumbJsonLd)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-[calc(var(--bn-height)*2+var(--bn-padding)+2rem)] lg:py-10 lg:pb-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeBreadcrumbJsonLd }} />
      <TrackRecentlyViewed
        product={{
          productId: p.id,
          slug: p.slug,
          name: p.name,
          brand: p.brand,
          imageUrl: p.images[0]?.url ?? null,
          price,
          promoPrice: p.promoPrice,
          rating: avgRating,
          reviewsCount: p.reviews.length,
        }}
      />

      <nav aria-label="Fil d'ariane" className="mb-6 text-xs text-slate-500">
        <Link href="/" className="hover:text-para-700">Accueil</Link>
        {p.category && (
          <>
            <span className="mx-1.5">/</span>
            <Link href={`/categories/${p.category.slug}`} className="hover:text-para-700">{p.category.name}</Link>
          </>
        )}
        <span className="mx-1.5">/</span>
        <span className="font-semibold text-para-800">{p.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <Gallery images={p.images.map((i) => ({ url: i.url, alt: i.alt ?? p.name }))} name={p.name} />

        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-para-500">{p.brand}</p>
          <h1 className="mt-1 font-display text-3xl font-medium leading-tight text-para-950 lg:text-4xl">{p.name}</h1>

          {avgRating !== null && (
            <p className="mt-2 text-sm">
              <span className="text-amber-500">{"★".repeat(Math.round(avgRating))}</span>
              <span className="text-slate-300">{"★".repeat(5 - Math.round(avgRating))}</span>
              <a href="#avis" className="ml-2 text-slate-500 hover:text-para-700">{p.reviews.length} avis</a>
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <span className="font-display text-4xl font-semibold text-para-800">{formatPrice(price)}</span>
            {discount !== null && (
              <>
                <span className="text-xl text-slate-400 line-through">{formatPrice(p.price)}</span>
                <span className="badge-promo rounded-full px-3 py-1 text-sm font-extrabold text-white">-{discount}%</span>
              </>
            )}
            {isNew && (
              <span className="badge-new rounded-full px-3 py-1 text-sm font-bold text-white">Nouveau ✨</span>
            )}
          </div>

          {shortDescription && <p className="mt-4 leading-relaxed text-slate-600">{shortDescription}</p>}

          <div className="mt-5 space-y-1.5 text-sm">
            {inStock ? (
              lowStock ? (
                <p className="flex items-center gap-2 font-semibold text-coral-600">
                  ⚡ Stock faible — plus que {p.stock} exemplaire(s)
                </p>
              ) : (
                <p className="flex items-center gap-2 font-semibold text-emerald-600">✓ En stock — expédié sous 24h</p>
              )
            ) : (
              <p className="font-semibold text-slate-400">✕ Momentanément indisponible</p>
            )}
            <p className="text-slate-500">
              🚚 Livraison {DELIVERY_CASABLANCA_H} à Casablanca, {DELIVERY_OTHER_H} ailleurs · offerte dès{" "}
              {FREE_SHIPPING_THRESHOLD_DH} DH
            </p>
            <p className="text-slate-500">💵 Paiement à la livraison disponible</p>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-para-100 bg-white/70 p-4 shadow-sm">
          <ProductPurchasePanel
            product={{
              productId: p.id,
              slug: p.slug,
              name: p.name,
              brand: p.brand,
              imageUrl: p.images[0]?.url ?? null,
              price,
              promoPrice: p.promoPrice,
              rating: avgRating,
              reviewsCount: p.reviews.length,
              maxStock: p.unlimitedStock ? -1 : p.stock,
              outOfStock: !inStock,
            }}
          />
          </div>

          {!inStock && <StockAlertForm productId={p.id} productName={p.name} inStock={inStock} />}

          <div className="mt-4">
            <WhatsAppButton productName={p.name} />
          </div>

          {(p.sku || p.barcode) && (
            <p className="mt-5 text-xs text-slate-400">
              Réf. {p.sku ?? "—"} {p.barcode ? `· EAN ${p.barcode}` : ""}
            </p>
          )}
        </div>
      </div>

      {/* Onglets */}
      <section className="mt-16 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="rounded-3xl border border-para-100 bg-white p-7 shadow-sm">
          <h2 className="font-display text-xl font-bold text-para-900">Description</h2>
          <hr className="hr-gradient my-4 w-24" />
          <div className="prose-sm whitespace-pre-wrap leading-relaxed text-slate-600">
            {cleanDescription(p.description) ?? "Description en cours de rédaction."}
          </div>
        </div>

        {p.reviews.length > 0 && <aside id="avis" className="space-y-4">
          <h2 className="font-display text-xl font-bold text-para-900">
            Avis clients <span className="text-slate-400">({p.reviews.length})</span>
          </h2>
          {[...p.reviews]
            .sort((a, b) => Number(b.verifiedPurchase) - Number(a.verifiedPurchase))
            .slice(0, 5)
            .map((r) => (
              <article key={r.id} className="rounded-2xl border border-para-100 bg-white p-4 shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm">{r.author}</strong>
                    {r.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <span aria-hidden>✓</span> Achat vérifié
                      </span>
                    )}
                  </div>
                  <span className="text-amber-500 text-sm">{"★".repeat(r.rating)}</span>
                </header>
                {r.comment && <p className="mt-1.5 text-sm text-slate-600">{r.comment}</p>}
              </article>
            ))}
        </aside>
        }
      </section>

      {reputation && (reputation.status === "READY" || reputation.status === "STALE") && reputation.sources.length > 0 && (
        <section className="mt-10">
          <ReputationSection reputation={reputation} />
        </section>
      )}

      {priceHistory.length >= 2 && (
        <section className="mt-16">
          <h2 className="mb-6 font-display text-2xl font-extrabold text-para-950">Historique des prix</h2>
          <div className="rounded-3xl border border-para-100 bg-white p-6 shadow-sm">
            <PriceChart history={priceHistory} />
          </div>
        </section>
      )}

      {priceHistory.length === 0 && (
        <section className="mt-16">
          <h2 className="mb-6 font-display text-2xl font-extrabold text-para-950">Historique des prix</h2>
          <p className="rounded-3xl border border-dashed border-para-200 bg-mint/40 p-6 text-center text-sm text-slate-500">
            Aucun historique disponible.
          </p>
        </section>
      )}

      {similar.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 font-display text-2xl font-extrabold text-para-950">Produits similaires</h2>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {similar.map((s) => (
              <ProductCard key={s.id} p={{ ...s, stock: 0, unlimitedStock: true }} />
            ))}
          </div>
        </section>
      )}

      {popular.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 font-display text-2xl font-extrabold text-para-950">À la une / Populaires</h2>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {popular.map((r) => (
              <ProductCard key={r.id} p={{ ...r, stock: 0, unlimitedStock: true }} />
            ))}
          </div>
        </section>
      )}

      <RecentlyViewedSection excludeId={p.id} />

      {p.sourceUrl && (
        <p className="mt-12 text-center text-[11px] text-slate-300">
          Fiche produit mise à jour automatiquement depuis nos partenaires ({p.sourceName}).
        </p>
      )}

      <StickyAddToCart
        product={{
          productId: p.id,
          slug: p.slug,
          name: p.name,
          brand: p.brand,
          imageUrl: p.images[0]?.url ?? null,
          price,
          promoPrice: p.promoPrice,
          rating: avgRating,
          reviewsCount: p.reviews.length,
          maxStock: p.unlimitedStock ? -1 : p.stock,
        }}
        outOfStock={!inStock}
      />
    </div>
  );
}
