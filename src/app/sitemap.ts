import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const staticPages = ["", "/promotions", "/nouveautes", "/a-propos", "/livraison-retours", "/faq", "/contact", "/cgv", "/mentions-legales", "/confidentialite"].map(
    (p) => ({ url: `${base}${p}`, lastModified: new Date() })
  );

  try {
    const [products, categories] = await Promise.all([
      db.product.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
      db.category.findMany({ select: { slug: true } }),
    ]);
    return [
      ...staticPages,
      ...categories.map((c) => ({ url: `${base}/categories/${c.slug}`, lastModified: new Date() })),
      ...products.map((p) => ({ url: `${base}/produits/${p.slug}`, lastModified: p.updatedAt })),
    ];
  } catch {
    return staticPages;
  }
}
