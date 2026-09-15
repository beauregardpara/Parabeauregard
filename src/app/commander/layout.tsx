import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Finaliser ma commande",
  description: "Validez votre commande Para Beauregard : coordonnées, livraison et paiement.",
  robots: { index: false },
};

export default function CommanderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
