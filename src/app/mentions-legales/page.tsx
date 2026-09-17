import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";
import { BUSINESS } from "@/config/business";

export const metadata: Metadata = { title: "Mentions légales" };

export default function MentionsLegalesPage() {
  return (
    <ContentPage title="Mentions légales">
      <h2>Éditeur du site</h2>
      <p>
        <strong>{BUSINESS.name}</strong><br />
        {BUSINESS.locationLabel}<br />
        Téléphone : {BUSINESS.phoneDisplay}<br />
        Email : {BUSINESS.email}
      </p>
      {/* Informations légales à fournir par l'exploitant : ne jamais les inventer. */}
      <p>
        Forme juridique, capital social, adresse du siège, RC, ICE et IF : informations en cours de
        mise à jour par l'exploitant.
      </p>

      <h2>Hébergement</h2>
      <p>
        Site hébergé par Vercel Inc. (vercel.com). Base de données et images produits hébergées par
        Supabase (supabase.com).
      </p>

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
