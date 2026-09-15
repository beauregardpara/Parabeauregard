export function formatPrice(value: number | null | undefined): string {
  if (value == null) return "";
  return `${value.toLocaleString("fr-MA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} DH`;
}

/** Arrondit un nombre monétaire à 2 décimales (centimes). Évite les erreurs flottantes. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function discountPercent(price: number, promoPrice: number | null | undefined): number | null {
  if (!promoPrice || promoPrice >= price) return null;
  return Math.round(((price - promoPrice) / price) * 100);
}

export function effectivePrice(p: { price: number; promoPrice: number | null }): number {
  return p.promoPrice && p.promoPrice < p.price ? p.promoPrice : p.price;
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
