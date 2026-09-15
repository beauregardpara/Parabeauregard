// ── Configuration e-commerce unique (Para Beauregard) ──────────────────────
import { BUSINESS } from "@/config/business";
// Ces valeurs sont la source par défaut côté client/navigateur. Le serveur
// (lib/settings.ts + server actions de commande) les lit depuis la base et fait
// TOUJOURS autorité lors du calcul final du total d'une commande.
//
// ⚠️ Si vous modifiez ces valeurs, pensez aussi à mettre à jour les paramètres
// en base (`shipping_flat`, `free_shipping_threshold`, `loyalty_points_per_dhs`).

export const SHIPPING_FLAT_DH = 29;
export const FREE_SHIPPING_THRESHOLD_DH = 500;
export const RETURN_DAYS = 7;
export const DELIVERY_CASABLANCA_H = "24h";
export const DELIVERY_OTHER_H = "48–72h";

// Devise affichée (MAD/DH)
export const CURRENCY = "DH";

// WhatsApp du service client (numéro international, sans "+")
export const WHATSAPP_NUMBER = BUSINESS.phoneInternational.replace("+", "");

export function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
