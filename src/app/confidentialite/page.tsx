import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";
import { BUSINESS } from "@/config/business";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function ConfidentialitePage() {
  return (
    <ContentPage title="Politique de confidentialité" subtitle="Conformité loi 09-08 — protection des données personnelles.">
      <h2>Données collectées</h2>
      <ul>
        <li><strong>Commandes :</strong> nom, téléphone, email (facultatif), adresse de livraison, produits achetés et montants.</li>
        <li><strong>Compte client :</strong> nom, email, téléphone, adresses, favoris et historique de commandes.</li>
        <li><strong>Formulaire de contact :</strong> nom, email, téléphone (facultatif) et message.</li>
        <li><strong>Assistant :</strong> messages échangés, conservés pour le suivi du service. Ne partagez pas d'informations médicales personnelles.</li>
        <li><strong>Statistiques internes :</strong> compteurs de consultation des produits, sans cookie de mesure d'audience.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        Le site utilise uniquement des cookies strictement nécessaires (session client et session
        administrateur). Aucun cookie publicitaire ni outil de mesure d'audience tiers n'est utilisé.
      </p>

      <h2>Finalités</h2>
      <p>Traitement et livraison des commandes, service client, gestion du compte et amélioration du catalogue.</p>

      <h2>Prestataires techniques</h2>
      <ul>
        <li><strong>Vercel</strong> : hébergement du site.</li>
        <li><strong>Supabase</strong> : base de données et stockage des images produits.</li>
        <li><strong>Resend</strong> : envoi des emails transactionnels (confirmation de commande, notifications).</li>
      </ul>

      <h2>Vos droits</h2>
      <p>
        Conformément à la loi 09-08, vous disposez d'un droit d'accès, de rectification et d'opposition.
        Adressez vos demandes à {BUSINESS.email} — réponse sous 30 jours maximum.
      </p>

      <h2>Sécurité & conservation</h2>
      <p>
        Connexion chiffrée HTTPS, mots de passe hachés (jamais stockés en clair), accès administrateurs
        restreint et journalisé. Les données de commande sont conservées le temps légal requis.
      </p>
    </ContentPage>
  );
}
