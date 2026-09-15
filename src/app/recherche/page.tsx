import type { Metadata } from "next";
import { ProductListing, type ListingParams } from "@/components/product-listing";

export async function generateMetadata({ searchParams }: { searchParams: Promise<ListingParams> }): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Recherche « ${q} »` : "Recherche",
    robots: { index: false },
  };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<ListingParams> }) {
  const { q } = await searchParams;
  return (
    <ProductListing
      searchParams={searchParams}
      basePath="/recherche"
      title={q ? `Résultats pour\u00a0«\u00a0${q}\u00a0»` : "Rechercher un produit"}
      subtitle="Trouvez le produit qu'il vous faut parmi tout notre catalogue."
    />
  );
}
