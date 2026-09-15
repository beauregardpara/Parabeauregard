import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function ConfidentialitePage() {
  return (
    <ContentPage title="Politique de confidentialité" subtitle="Conformité loi 09-08 — protection des données personnelles.">
      <h2>Données collectées</h2>
      <ul>
        <li><strong>Compte client :</strong> nom, email, téléphone, adresses.</li>
        <li><strong>Commandes :</strong> produits achetés, montant, historique.</li>
        <li><strong>Assistant IA :</strong> messages échangés pour améliorer nos recommandations (anonymisés).</li>
        <li><strong>Navigation :</strong> données statistiques agrégées (pages vues).</li>
      </ul>

      <h2>Finalités</h2>
      <p>Traitement des commandes, service client, amélioration du catalogue, information sur nos offres si vous y consentez.</p>

      <h2>Vos droits</h2>
      <p>
        Conformément à la loi 09-08, vous disposez d'un droit d'accès, de rectification et d'opposition.
        Adressez vos demandes à confidentialite@parabeauregard.ma — réponse sous 30 jours maximum.
      </p>

      <h2>Sécurité & conservation</h2>
      <p>
        Connexion chiffrée HTTPS, mots de passe hachés (jamais stockés en clair), accès administrateurs
        restreint et journalisé. Les données de commande sont conservées le temps légal requis.
      </p>
    </ContentPage>
  );
}
