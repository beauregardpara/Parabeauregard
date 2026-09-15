import type { Metadata, Viewport } from "next";
import "./globals.css";
import { db } from "@/lib/db";
import { getCurrentCustomer } from "@/lib/auth";
import { CartProvider, type CartItem } from "@/lib/cart-context";
import { CompareProvider } from "@/lib/compare-context";
import { FavoritesProvider, type FavoriteItem } from "@/lib/favorites-context";
import { RecentlyViewedProvider } from "@/lib/recently-viewed-context";
import { Header, type NavCategory } from "@/components/header";
import { Footer } from "@/components/footer";
import { ChatWidget } from "@/components/chat-widget";
import { CompareWidget } from "@/components/compare-widget";
import { BottomNav } from "@/components/bottom-nav";
import { ScrollProgress } from "@/components/motion";
import { syncCartForCustomer } from "@/lib/actions/cart";
import { syncFavoriteForCustomer } from "@/lib/actions/favorites";
import { headers } from "next/headers";
import { BUSINESS } from "@/config/business";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Para Beauregard — Parapharmacie en ligne au Maroc",
    template: "%s | Para Beauregard",
  },
  description:
    "Parapharmacie en ligne marocaine : soins visage et corps, cheveux, solaire, bébé, hygiène et compléments alimentaires. Produits authentiques, paiement à la livraison partout au Maroc.",
  keywords: ["parapharmacie maroc", "parapharmacie en ligne", "soins visage", "beauté maroc", "produits parapharmaceutiques"],
  manifest: "/manifest",
};

export const viewport: Viewport = {
  themeColor: "#123f36",
  width: "device-width",
  initialScale: 1,
};

async function getNavCategories(): Promise<NavCategory[]> {
  try {
    const parents = await db.category.findMany({
      where: { parentId: null, visible: true },
      orderBy: { order: "asc" },
      include: { children: { where: { visible: true }, orderBy: { order: "asc" } } },
    });
    return parents.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      icon: p.icon,
      children: p.children.map((c) => ({ id: c.id, name: c.name, slug: c.slug, icon: c.icon })),
    }));
  } catch {
    return [];
  }
}

async function loadSyncedState() {
  try {
    const customer = await getCurrentCustomer();
    if (!customer) return { cartItems: [] as CartItem[], favorites: [] as FavoriteItem[] };

    const [cartRows, favRows] = await Promise.all([
      db.cartItem.findMany({
        where: { customerId: customer.id },
        include: { product: { include: { images: { orderBy: { order: "asc" }, take: 1 } } } },
      }),
      db.favorite.findMany({
        where: { customerId: customer.id },
        include: { product: { include: { images: { orderBy: { order: "asc" }, take: 1 } } } },
      }),
    ]);

    const cartItems: CartItem[] = cartRows
      .map(
        (r): CartItem | null => {
          if (!r.product) return null;
          const effective =
            r.product.promoPrice && r.product.promoPrice < r.product.price ? r.product.promoPrice : r.product.price;
          return {
            productId: r.product.id,
            slug: r.product.slug,
            name: r.product.name,
            imageUrl: r.product.images[0]?.url ?? null,
            price: effective,
            qty: r.quantity,
            maxStock: r.product.unlimitedStock ? -1 : r.product.stock,
          };
        }
      )
      .filter((x): x is CartItem => x !== null);

    const favorites: FavoriteItem[] = favRows
      .map(
        (f): FavoriteItem | null => {
          if (!f.product) return null;
          return {
            productId: f.product.id,
            slug: f.product.slug,
            name: f.product.name,
            brand: f.product.brand,
            imageUrl: f.product.images[0]?.url ?? null,
            price: f.product.price,
            promoPrice: f.product.promoPrice,
            rating: null,
            reviewsCount: 0,
          };
        }
      )
      .filter((x): x is FavoriteItem => x !== null);

    return { cartItems, favorites };
  } catch {
    return { cartItems: [] as CartItem[], favorites: [] as FavoriteItem[] };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (pathname.startsWith("/admin")) {
    return <html lang="fr"><body className="min-h-dvh">{children}</body></html>;
  }
  const categories = (await getNavCategories()) as NavCategory[];
  const { cartItems, favorites } = await loadSyncedState();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://parabeauregard.ma";
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Para Beauregard",
    url: siteUrl,
    email: BUSINESS.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: BUSINESS.city,
      addressCountry: "MA",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: BUSINESS.latitude,
      longitude: BUSINESS.longitude,
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: BUSINESS.phoneInternational,
      contactType: "customer service",
      availableLanguage: ["fr", "ar"],
    },
  };
  const safeOrgJsonLd = JSON.stringify(orgJsonLd).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");

  return (
    <html lang="fr">
      <head>
        {/* Sans JavaScript, l'animation d'apparition ne se déclenche jamais :
            le contenu doit rester visible (robots, JS bloqué, erreur réseau). */}
        <noscript>
          <style>{".reveal{opacity:1!important;transform:none!important;transition:none!important}"}</style>
        </noscript>
      </head>
      <body className="min-h-dvh">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeOrgJsonLd }} />
        <CartProvider initialItems={cartItems} serverSync={syncCartForCustomer}>
          <CompareProvider>
            <FavoritesProvider initialFavorites={favorites} serverSync={syncFavoriteForCustomer}>
              <RecentlyViewedProvider>
                <ScrollProgress />
                <a href="#main" className="skip-link">Aller au contenu</a>
                <Header categories={categories} />
                <main id="main" className="has-bottom-nav">{children}</main>
                <Footer categories={categories} />
                <BottomNav />
                <ChatWidget />
                <CompareWidget />
              </RecentlyViewedProvider>
            </FavoritesProvider>
          </CompareProvider>
        </CartProvider>
      </body>
    </html>
  );
}
