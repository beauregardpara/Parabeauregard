import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";
import { BUSINESS } from "@/config/business";
import { LEGAL_PENDING_LABEL, getLegalEntries } from "@/config/legal";

export const metadata: Metadata = { title: "Mentions légales" };

export default function MentionsLegalesPage() {
  const legal = getLegalEntries();
  return (
    <ContentPage title="Mentions légales">
      <h2>Éditeur du site</h2>
      <p>
        <strong>{BUSINESS.name}</strong><br />
        {BUSINESS.locationLabel}<br />
        Téléphone : {BUSINESS.phoneDisplay}<br />
        Email : {BUSINESS.email}
      </p>

      {/* Informations légales fournies par l'exploitant (variables LEGAL_*) : jamais inventées. */}
      <h2>Informations légales</h2>
      <ul>
        {legal.map((entry) => (
          <li key={entry.key} data-legal-field={entry.key} data-pending={entry.value ? undefined : "true"}>
            <strong>{entry.label} :</strong> {entry.value ?? <em>{LEGAL_PENDING_LABEL}</em>}
          </li>
        ))}
      </ul>

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
