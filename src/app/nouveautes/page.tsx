import type { Metadata } from "next";
import { ProductListing, type ListingParams } from "@/components/product-listing";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Nouveautés",
  description: "Les derniers arrivages de notre parapharmacie en ligne : nouveautés soins, beauté et bien-être.",
};

export default async function NouveautesPage({ searchParams }: { searchParams: Promise<ListingParams> }) {
  return (
    <ProductListing
      searchParams={searchParams}
      basePath="/nouveautes"
      title="Nouveautés ✨"
      subtitle="Les toutes dernières références ajoutées au catalogue (30 derniers jours), validées par nos équipes."
      onlyRecent
    />
  );
}
