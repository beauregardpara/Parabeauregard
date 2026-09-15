"use client";

import { useEffect } from "react";

/**
 * Ferme un overlay/drawer/dialog avec la touche Échap quand il est ouvert.
 * Évite de réimplémenter l'écouteur dans chaque composant.
 */
export function useEscapeClose(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}