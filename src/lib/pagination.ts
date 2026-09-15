/**
 * Pages à afficher dans une barre de pagination : première, dernière, page
 * courante et ses voisines, séparées par des ellipses.
 *
 * Afficher toutes les pages faisait déborder l'écran sur mobile dès une
 * dizaine de pages (barre de 1096 px sur un écran de 375 px).
 */
export function paginationItems(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current]);
  if (current - 1 > 1) pages.add(current - 1);
  if (current + 1 < total) pages.add(current + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const items: (number | "…")[] = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) items.push("…");
    items.push(page);
    previous = page;
  }
  return items;
}
