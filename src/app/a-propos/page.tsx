import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ContentPage } from "@/components/content-page";
import { getBusinessPolicies } from "@/config/legal";

export const metadata: Metadata = {
  title: "À propos",
  description: "Découvrez Para Beauregard, votre parapharmacie en ligne de confiance au Maroc.",
};

export default function AProposPage() {
  const { openingHours } = getBusinessPolicies();
  return (
    <ContentPage
      title="À propos de Para Beauregard"
      subtitle="Une parapharmacie moderne, pensée pour les Marocains exigeants sur leur santé et leur beauté."
    >
      <div className="not-prose relative mb-8 overflow-hidden rounded-3xl border border-para-100 bg-mint shadow-soft">
        <Image src="/images/premium/about/about-para.webp" alt="Sélection de soins et de bien-être Para Beauregard" width={1400} height={900} className="h-64 w-full object-cover sm:h-80" />
      </div>
      <p>
        <strong>Para Beauregard</strong> est née d'une conviction simple : l'accès aux produits de
        parapharmacie authentiques ne devrait jamais être compliqué. Basés à Casablanca, nous
        sélectionnons rigoureusement chaque référence auprès de distributeurs officiels pour vous
        garantir des produits sûrs, traçables et au juste prix.
      </p>
      <h2>Notre histoire</h2>
      <p>
        Para Beauregard grandit autour d&apos;une idée simple : rendre le soin quotidien plus clair,
        plus agréable et plus fiable. Chaque référence est présentée avec les informations disponibles
        dans notre catalogue, afin de vous aider à choisir avec sérénité.
      </p>
      <h2>Notre promesse</h2>
      <ul>
        <li><strong>Authenticité garantie :</strong> chaque produit provient de circuits officiels.</li>
        <li><strong>Prix justes :</strong> des tarifs comparés en permanence avec le marché marocain.</li>
        <li><strong>Livraison rapide :</strong> expédition sous 24h, livraison en 24h à Casablanca et 48–72h dans le reste du Maroc.</li>
        <li><strong>Conseil de proximité :</strong> nos conseillères et notre assistant IA vous orientent selon vos besoins réels.</li>
      </ul>
      <h2>Notre catalogue</h2>
      <p>
        Soins du visage, corps et cheveux, protection solaire, hygiène, produits bébé, compléments
        alimentaires… Notre catalogue est enrichi quotidiennement grâce à une veille automatisée des
        références les plus demandées, validée par notre équipe avant mise en vente.
      </p>
      <h2>Une question ?</h2>
      <p>
        Notre équipe vous répond{openingHours ? ` ${openingHours}` : " par téléphone, WhatsApp ou email"}. Écrivez-nous via la page{" "}
        <Link href="/contact">contact</Link> ou essayez notre assistant intelligent en bas à droite de votre écran.
      </p>
    </ContentPage>
  );
}
