"use client";

/** Bouton d'impression (bon de livraison / facture) — composant client. */
export function PrintButton({ label, className }: { label: string; className?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      {label}
    </button>
  );
}
