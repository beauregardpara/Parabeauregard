import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ProductListing, getCategoryBreadcrumb, type ListingParams } from "@/components/product-listing";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = await db.category.findUnique({ where: { slug } });
  if (!cat) return {};
  return {
    title: `${cat.name} — Parapharmacie en ligne`,
    description: `Découvrez notre sélection ${cat.name.toLowerCase()} : produits authentiques au meilleur prix, livrés partout au Maroc.`,
    alternates: { canonical: `/categories/${slug}` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ListingParams>;
}) {
  const { slug } = await params;
  const cat = await getCategoryBreadcrumb(slug);
  if (!cat) notFound();

  return (
    <ProductListing
      categorySlug={slug}
      searchParams={searchParams}
      basePath={`/categories/${slug}`}
      title={cat.name}
      subtitle={`Notre sélection ${cat.name.toLowerCase()} : produits authentiques, livrés partout au Maroc.`}
      bannerIcon={cat.icon}
    />
  );
}
