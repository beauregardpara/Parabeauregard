/**
 * Choix du nombre d'éléments affichés par page (boutique et administration).
 *
 * « Tout afficher » est borné : au-delà, la page deviendrait si lourde qu'elle
 * pénaliserait surtout les clients en mobile. La borne est volontairement plus
 * haute que le catalogue actuel, pour que « tout » veuille bien dire tout.
 */
export const SHOP_PAGE_SIZES = [12, 24, 48, 96] as const;
export const ADMIN_PAGE_SIZES = [25, 50, 100, 200] as const;

/** Valeur du paramètre d'URL demandant l'affichage complet. */
export const ALL_KEYWORD = "tout";

/** Garde-fou commun : jamais plus d'éléments que cela en une seule page. */
export const MAX_PAGE_SIZE = 1000;

export type PageSizeChoice = { value: number; label: string; param: string; isAll: boolean };

export function parsePageSize(
  raw: string | undefined,
  sizes: readonly number[],
  fallback: number
): { perPage: number; isAll: boolean; param: string } {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === ALL_KEYWORD) return { perPage: MAX_PAGE_SIZE, isAll: true, param: ALL_KEYWORD };
  const n = Number(value);
  if (Number.isInteger(n) && sizes.includes(n)) return { perPage: n, isAll: false, param: String(n) };
  return { perPage: fallback, isAll: false, param: String(fallback) };
}

/** Options proposées à l'utilisateur, « Tout » inclus avec son effectif réel. */
export function pageSizeChoices(sizes: readonly number[], total: number): PageSizeChoice[] {
  return [
    ...sizes.map((n) => ({ value: n, label: String(n), param: String(n), isAll: false })),
    { value: MAX_PAGE_SIZE, label: `Tout (${Math.min(total, MAX_PAGE_SIZE)})`, param: ALL_KEYWORD, isAll: true },
  ];
}
