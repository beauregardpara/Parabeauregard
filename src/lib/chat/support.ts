import { BUSINESS } from "@/config/business";
import { DELIVERY_CASABLANCA_H, DELIVERY_OTHER_H, RETURN_DAYS, WHATSAPP_NUMBER } from "@/lib/constants";
import { getSettingNumber, SETTING_KEYS } from "@/lib/settings";

/**
 * Questions pratiques sur la boutique (livraison, paiement, contact, commande,
 * retours). Les réponses sont construites uniquement à partir des informations
 * réellement configurées : rien n'est inventé.
 */
export type SupportIntent = "delivery" | "payment" | "contact" | "order" | "returns";

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const INTENT_PATTERNS: [SupportIntent, RegExp][] = [
  ["returns", /\b(?:retour(?:ner)?|rembours\w*|echanger|echange)\b/],
  ["payment", /\b(?:paiement|payer|paye|carte bancaire|carte bleue|cash|especes|cmi|virement)\b/],
  ["delivery", /\b(?:livraison|livrez|livrer|livre|livres|delai|delais|frais de port|expedition|expedie[sz]?)\b/],
  ["order", /\b(?:comment commander|passer (?:une |ma )?commande|suivre (?:ma |une )?commande|suivi de (?:ma |la )?commande|ou en est ma commande)\b/],
  ["contact", /\b(?:contact(?:er)?|telephone|tel|whatsapp|numero|joindre|appeler|adresse|horaires?|ou etes[- ]vous|localisation|magasin|boutique physique)\b/],
];

/** Produits dont le nom contient un mot « pratique » (ex. lentilles de contact). */
const PRODUCT_PHRASES = /\b(?:lentilles? de contact|solution (?:pour )?lentilles?)\b/;

export function detectSupportIntent(message: string): SupportIntent | null {
  const text = normalize(message);
  if (PRODUCT_PHRASES.test(text)) return null;
  for (const [intent, re] of INTENT_PATTERNS) {
    if (re.test(text)) return intent;
  }
  return null;
}

export type SupportInfo = { shippingFlat: number; freeShippingThreshold: number };

export async function getSupportInfo(): Promise<SupportInfo> {
  const [shippingFlat, freeShippingThreshold] = await Promise.all([
    getSettingNumber(SETTING_KEYS.shippingFlat),
    getSettingNumber(SETTING_KEYS.freeShippingThreshold),
  ]);
  return { shippingFlat, freeShippingThreshold };
}

function contactLine(): string {
  return `Téléphone : ${BUSINESS.phoneDisplay} · WhatsApp : wa.me/${WHATSAPP_NUMBER} · Email : ${BUSINESS.email}`;
}

export function buildSupportReply(intent: SupportIntent, info: SupportInfo): string {
  switch (intent) {
    case "delivery": {
      const fee =
        info.shippingFlat > 0
          ? `Les frais de livraison sont de ${info.shippingFlat} DH`
          : "La livraison est offerte";
      const free =
        info.shippingFlat > 0 && info.freeShippingThreshold > 0
          ? `, offerts dès ${info.freeShippingThreshold} DH d'achat`
          : "";
      return [
        `Nous livrons partout au Maroc. ${fee}${free} (montant exact calculé au moment de la commande).`,
        `Délais indicatifs : ${DELIVERY_CASABLANCA_H} ouvrées à Casablanca, ${DELIVERY_OTHER_H} pour le reste du Maroc.`,
        "Détails : page « Livraison & retours ».",
      ].join("\n");
    }
    case "payment":
      return [
        "Le paiement se fait à la livraison, en espèces, à la réception de votre colis.",
        "Le paiement par carte en ligne n'est pas disponible pour le moment.",
      ].join("\n");
    case "order":
      return [
        "Pour commander : ajoutez vos produits au panier, cliquez sur « Passer commande », puis indiquez votre nom, téléphone et adresse de livraison. Vous payez à la livraison.",
        "Pour suivre une commande : page « Suivi de commande » avec votre référence (PB-…), ou votre espace client.",
      ].join("\n");
    case "returns":
      return [
        `Les produits non ouverts, dans leur emballage d'origine, peuvent être retournés sous ${RETURN_DAYS} jours après réception.`,
        "Faites votre demande depuis la page « Retour » ; conditions complètes sur la page « Livraison & retours ».",
      ].join("\n");
    case "contact":
      return [
        `${BUSINESS.name} — ${BUSINESS.locationLabel}.`,
        contactLine(),
        "Vous pouvez aussi nous écrire depuis la page « Contact ».",
      ].join("\n");
  }
}
