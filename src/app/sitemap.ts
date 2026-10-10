import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE_URL } from "@/config/site";
import { slugify } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL;
  const staticPages = ["", "/promotions", "/nouveautes", "/marques", "/besoin", "/a-propos", "/livraison-retours", "/faq", "/contact", "/cgv", "/mentions-legales", "/confidentialite"].map(
    (p) => ({ url: `${base}${p}`, lastModified: new Date() })
  );

  try {
    const [products, categories, brandRows] = await Promise.all([
      db.product.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
      db.category.findMany({ where: { visible: true }, select: { slug: true, createdAt: true } }),
      db.product.findMany({ where: { status: "PUBLISHED", brand: { not: null } }, select: { brand: true, updatedAt: true }, distinct: ["brand"] }),
    ]);
    return [
      ...staticPages,
      ...categories.map((c) => ({ url: `${base}/categories/${c.slug}`, lastModified: c.createdAt })),
      ...brandRows.filter((b): b is { brand: string; updatedAt: Date } => Boolean(b.brand)).map((b) => ({ url: `${base}/marques/${slugify(b.brand)}`, lastModified: b.updatedAt })),
      ...products.map((p) => ({ url: `${base}/produits/${p.slug}`, lastModified: p.updatedAt })),
    ];
  } catch {
    return staticPages;
  }
}
