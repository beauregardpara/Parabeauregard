/**
 * Reconnaissance des données de démonstration / QA (adresses réservées aux
 * tests). Une vraie commande n'est jamais concernée : les domaines ci-dessous ne
 * peuvent pas recevoir d'email réel.
 */
const DEMO_EMAIL_PATTERNS = [
  /@example\.(com|org|net|ma)$/i,
  /@([a-z0-9-]+\.)*example$/i,
  /\.invalid$/i,
  /\.test$/i,
  /@demo\.ma$/i,
];

export function isDemoEmail(email: string | null | undefined): boolean {
  const value = (email ?? "").trim();
  if (!value.includes("@")) return false;
  return DEMO_EMAIL_PATTERNS.some((re) => re.test(value));
}

export function canCancelAsDemo(order: { email: string | null; status: string }): boolean {
  return isDemoEmail(order.email) && order.status !== "CANCELLED" && order.status !== "DELIVERED";
}
