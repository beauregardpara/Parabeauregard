import type { Metadata } from "next";
import { ContentPage } from "@/components/content-page";
import { BUSINESS } from "@/config/business";
import { RETURN_DAYS } from "@/lib/constants";
import { getSettingNumber, SETTING_KEYS } from "@/lib/settings";

// Frais de livraison lus en base : la page reflète toujours le calcul du panier.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "CGV" };

export default async function CgvPage() {
  const [shippingFlat, freeShippingThreshold] = await Promise.all([
    getSettingNumber(SETTING_KEYS.shippingFlat),
    getSettingNumber(SETTING_KEYS.freeShippingThreshold),
  ]);
  return (
    <ContentPage title="Conditions Générales de Vente">
      <h2>1. Objet</h2>
      <p>
        Les présentes CGV régissent les ventes de produits réalisées sur le site Para Beauregard par{" "}
        {BUSINESS.name} ({BUSINESS.locationLabel}) au profit de consommateurs résidant au Maroc.
      </p>

      <h2>2. Commandes</h2>
      <p>
        Toute commande vaut acceptation des présentes CGV. La commande est confirmée à l'écran par sa
        référence, puis par email lorsqu'une adresse est fournie. Nous nous
        réservons le droit d'annuler toute commande en cas d'indisponibilité avérée du produit ou d'erreur
        manifeste de prix.
      </p>

      <h2>3. Prix</h2>
      <p>
        Les prix sont indiqués en dirhams marocains (MAD), toutes taxes comprises, hors frais de livraison
        ({shippingFlat > 0 ? `${shippingFlat} DH` : "offerts"}
        {shippingFlat > 0 && freeShippingThreshold > 0 ? ` ; offerts dès ${freeShippingThreshold} DH d'achat` : ""}).
      </p>

      <h2>4. Paiement</h2>
      <ul>
        <li>Le paiement s'effectue exclusivement à la livraison, en espèces (COD).</li>
      </ul>

      <h2>5. Livraison</h2>
      <p>
        Livraison au Maroc sous 24 à 72h selon la ville, à l'adresse indiquée lors de la commande. Un produit
        momentanément indisponible est signalé avant expédition.
      </p>

      <h2>6. Droit de retour</h2>
      <p>
        Retour possible sous {RETURN_DAYS} jours pour tout produit non ouvert dans son emballage d'origine. Les produits
        d'hygiène intime et compléments ouverts ne sont pas repris. Le remboursement intervient sous 5 jours
        ouvrés après réception du retour.
      </p>

      <h2>7. Données personnelles</h2>
      <p>
        Vos données sont traitées conformément à la loi 09-08 relative à la protection des personnes
        physiques à l'égard du traitement des données à caractère personnel. Vous disposez d'un droit
        d'accès, de rectification et de suppression sur simple demande.
      </p>

      <h2>8. Litiges</h2>
      <p>Les présentes CGV sont soumises au droit marocain. En cas de litige, les tribunaux de Casablanca sont compétents.</p>
    </ContentPage>
  );
}
