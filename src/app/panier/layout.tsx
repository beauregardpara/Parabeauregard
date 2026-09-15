import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mon panier",
  description: "Consultez et gérez les produits de votre panier Para Beauregard.",
  robots: { index: false },
};

export default function PanierLayout({ children }: { children: React.ReactNode }) {
  return children;
}
