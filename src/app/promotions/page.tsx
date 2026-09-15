import type { Metadata } from "next";
import { ProductListing, type ListingParams } from "@/components/product-listing";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Promotions",
  description: "Toutes les promotions en cours sur notre parapharmacie en ligne : soins, beauté, hygiène et bien-être à prix réduit.",
};

export default async function PromotionsPage({ searchParams }: { searchParams: Promise<ListingParams> }) {
  const sp = await searchParams;
  return (
    <ProductListing
      searchParams={Promise.resolve({ ...sp, promo: "1" })}
      basePath="/promotions"
      title="Promotions 🔥"
      subtitle="Des remises vérifiées chaque jour sur les meilleures marques. Stock limité !"
    />
  );
}
