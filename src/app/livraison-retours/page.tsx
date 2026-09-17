import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";
import { RETURN_DAYS } from "@/lib/constants";
import { getSettingNumber, SETTING_KEYS } from "@/lib/settings";

// Frais de livraison lus en base : la page reflète toujours le calcul du panier.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Livraison & retours",
  description: "Délais, frais de livraison et conditions de retour chez Para Beauregard.",
};

export default async function LivraisonPage() {
  const [shippingFlat, freeShippingThreshold] = await Promise.all([
    getSettingNumber(SETTING_KEYS.shippingFlat),
    getSettingNumber(SETTING_KEYS.freeShippingThreshold),
  ]);
  return (
    <ContentPage title="Livraison & retours" subtitle="Tout ce qu'il faut savoir sur l'expédition de votre commande.">
      <h2>Zones et délais</h2>
      <ul>
        <li><strong>Casablanca :</strong> 24h ouvrées.</li>
        <li><strong>Rabat, Marrakech, Tanger, Fès, Agadir :</strong> 24 à 48h.</li>
        <li><strong>Reste du Maroc :</strong> 48 à 72h.</li>
      </ul>

      <h2>Frais de livraison</h2>
      {shippingFlat > 0 ? (
        <p>
          Frais forfaitaires de <strong>{shippingFlat} DH</strong>
          {freeShippingThreshold > 0 ? (
            <>, offerts pour toute commande supérieure ou égale à <strong>{freeShippingThreshold} DH</strong></>
          ) : null}
          . Le montant exact est affiché avant la validation de la commande.
        </p>
      ) : (
        <p>La livraison est offerte.</p>
      )}

      <h2>Paiement</h2>
      <ul>
        <li><strong>Paiement à la livraison (COD) :</strong> payez en espèces à réception.</li>
      </ul>

      <h2>Retours & remboursement</h2>
      <p>
        Conformément à nos CGV, les produits non ouverts et dans leur emballage d'origine peuvent être
        retournés dans un délai de <strong>{RETURN_DAYS} jours</strong> après réception. Contactez-nous d'abord via la
        page contact ; le remboursement est effectué sous 5 jours ouvrés après réception du retour.
        Pour raisons d'hygiène, certains produits (compléments ouverts, produits intimes) ne sont pas repris.
      </p>

      <h2>Suivi de commande</h2>
      <p>
        Le statut de votre commande est visible depuis votre espace client : reçue, en préparation,
        expédiée puis livrée.
      </p>
    </ContentPage>
  );
}
