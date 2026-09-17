/**
 * Informations légales de l'exploitant. Elles ne sont JAMAIS inventées : tant
 * que la variable d'environnement correspondante n'est pas définie (Vercel →
 * Settings → Environment Variables, puis redéploiement), la page affiche
 * « en attente ».
 */
type Env = Record<string, string | undefined>;

export const LEGAL_FIELDS = [
  { key: "legalForm", label: "Forme juridique", env: "LEGAL_FORM" },
  { key: "companyName", label: "Raison sociale", env: "LEGAL_COMPANY_NAME" },
  { key: "rc", label: "RC (registre du commerce)", env: "LEGAL_RC" },
  { key: "ice", label: "ICE", env: "LEGAL_ICE" },
  { key: "ifNumber", label: "IF (identifiant fiscal)", env: "LEGAL_IF" },
  { key: "registeredAddress", label: "Siège / adresse légale", env: "LEGAL_ADDRESS" },
  { key: "publicationDirector", label: "Responsable de la publication", env: "LEGAL_PUBLICATION_DIRECTOR" },
] as const;

export const LEGAL_PENDING_LABEL = "En attente — information à fournir par l'exploitant";

export type LegalEntry = { key: string; label: string; value: string | null };

export function getLegalEntries(env: Env = process.env): LegalEntry[] {
  return LEGAL_FIELDS.map((f) => ({ key: f.key, label: f.label, value: env[f.env]?.trim() || null }));
}

/**
 * Politiques commerciales à valider par l'exploitant. Sans valeur configurée,
 * le site n'annonce ni horaires ni délai de remboursement précis.
 */
export function getBusinessPolicies(env: Env = process.env): { openingHours: string | null; refundDelay: string | null } {
  return {
    openingHours: env.BUSINESS_OPENING_HOURS?.trim() || null,
    refundDelay: env.BUSINESS_REFUND_DELAY?.trim() || null,
  };
}
