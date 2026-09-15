import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Questions fréquentes sur Para Beauregard : commandes, livraison, paiement, produits.",
};

const FAQ = [
  ["Mes produits sont-ils authentiques ?", "Oui. Tous nos produits proviennent de distributeurs officiels des marques. L'authenticité et la traçabilité sont au cœur de notre engagement."],
  ["Comment suivre ma commande ?", "Depuis votre espace client, chaque commande affiche son statut en temps réel : reçue, en préparation, expédiée, livrée."],
  ["Puis-je payer à la livraison ?", "Absolument ! Le paiement à la livraison (espèces) est disponible partout au Maroc, c'est le seul mode de paiement proposé."],
  ["Que faire si un produit est cassé ou incorrect ?", "Contactez-nous sous 48h avec une photo du produit reçu. Nous procédons à un échange ou un remboursement immédiat."],
  ["L'assistant IA donne-t-il des conseils médicaux ?", "Non. Notre assistant vous oriente vers des produits adaptés à vos besoins exprimés, mais il ne pose aucun diagnostic et ne remplace pas un avis médical."],
  ["Livrez-vous hors du Maroc ?", "Pour le moment, nous livrons uniquement au Maroc. D'autres destinations arriveront bientôt."],
];

export default function FaqPage() {
  return (
    <ContentPage title="Questions fréquentes" subtitle="Les réponses aux questions que nos clients nous posent le plus souvent.">
      <div className="space-y-3">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group rounded-2xl border border-para-100 bg-white p-4 shadow-sm open:shadow-md">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-para-900">
              {q}
              <span className="ml-2 text-para-400 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{a}</p>
          </details>
        ))}
      </div>
    </ContentPage>
  );
}
