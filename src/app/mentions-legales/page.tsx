import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";
import { BUSINESS } from "@/config/business";

export const metadata: Metadata = { title: "Mentions légales" };

export default function MentionsLegalesPage() {
  return (
    <ContentPage title="Mentions légales">
      <h2>Éditeur du site</h2>
      <p>
        <strong>Para Beauregard SARL</strong><br />
        Capital : 100 000 MAD<br />
        Siège social : Casablanca, Maroc<br />
        RC : XXXXXX — ICE : XXXXXXXXXXXXX<br />
        Téléphone : {BUSINESS.phoneDisplay}<br />
        Email : {BUSINESS.email}
      </p>

      <h2>Hébergement</h2>
      <p>Hébergeur professionnel avec infrastructure redondante et sauvegardes quotidiennes.</p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L'ensemble du site (structure, textes, visuels, logo) est protégé par le droit d'auteur. Les
        marques citées appartiennent à leurs propriétaires respectifs et sont utilisées uniquement pour
        identifier les produits vendus.
      </p>

      <h2>Responsabilité</h2>
      <p>
        Les informations du site ont valeur indicative et ne constituent pas un avis médical. Pour tout
        problème de santé, consultez un professionnel de santé.
      </p>
    </ContentPage>
  );
}
