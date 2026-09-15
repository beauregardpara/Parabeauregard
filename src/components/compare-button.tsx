"use client";

import { useState } from "react";
import { useCompare, type CompareItem } from "@/lib/compare-context";

export function CompareButton({
  product,
  className = "",
  iconOnly = false,
}: {
  product: CompareItem;
  className?: string;
  iconOnly?: boolean;
}) {
  const { toggle, has } = useCompare();
  const active = has(product.id);
  const [notice, setNotice] = useState<string | null>(null);

  function onClick() {
    const res = toggle(product);
    if (res === "full") {
      setNotice("Maximum 4 produits à comparer");
      window.setTimeout(() => setNotice(null), 1800);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title="Comparer ce produit"
      aria-pressed={active}
      aria-label={active ? "Retirer de la comparaison" : "Ajouter à la comparaison"}
      className={`${className} flex items-center gap-1 text-[11px] font-bold transition ${
        active ? "text-para-700" : "text-slate-400 hover:text-para-700"
      }`}
    >
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3v18" />
        <path d="M5 7h14" />
        <path d="M5 17h14" />
        <path d="M8 7v10" />
        <path d="M16 7v10" />
      </svg>
      {!iconOnly && <span>{notice ? notice : active ? "Comparé" : "Comparer"}</span>}
    </button>
  );
}
