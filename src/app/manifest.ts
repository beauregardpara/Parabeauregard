import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Para Beauregard",
    short_name: "ParaBeauregard",
    description:
      "Parapharmacie en ligne marocaine : soins visage et corps, cheveux, solaire, bébé, hygiène et compléments alimentaires. Produits authentiques, paiement à la livraison partout au Maroc.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f6f4",
    theme_color: "#0f766e",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}