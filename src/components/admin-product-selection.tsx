"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Sélection des produits pour les actions groupées.
 *
 * Deux portées : les cases cochées sur la page affichée, ou l'ensemble des
 * produits correspondant au filtre courant (au-delà de la page).
 */

function setScope(form: HTMLFormElement | null | undefined, scope: "page" | "filtered", total: number) {
  const scopeInput = form?.querySelector<HTMLInputElement>('input[name="scope"]');
  const countInput = form?.querySelector<HTMLInputElement>('input[name="expectedCount"]');
  if (scopeInput) scopeInput.value = scope;
  if (countInput) countInput.value = scope === "filtered" ? String(total) : "";
}

export function SelectAllPageCheckbox({ count, total }: { count: number; total: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [checked, setChecked] = useState(false);
  const [allFiltered, setAllFiltered] = useState(false);
  const hasMore = total > count;

  useEffect(() => {
    const form = inputRef.current?.closest("form");
    if (!form) return;
    const sync = () => {
      const boxes = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="ids"]'));
      const every = boxes.length > 0 && boxes.every((box) => box.checked);
      setChecked(every);
      if (!every) {
        // Dès qu'une case est décochée, on repasse à la sélection de la page.
        setAllFiltered(false);
        setScope(form, "page", total);
      }
    };
    form.addEventListener("change", sync);
    return () => form.removeEventListener("change", sync);
  }, [total]);

  function toggleAllOnPage(next: boolean) {
    const form = inputRef.current?.closest("form");
    const boxes = form?.querySelectorAll<HTMLInputElement>('input[name="ids"]') ?? [];
    boxes.forEach((box) => {
      box.checked = next;
    });
    setChecked(next);
    setAllFiltered(false);
    setScope(form, "page", total);
  }

  function selectAllFiltered() {
    const form = inputRef.current?.closest("form");
    setAllFiltered(true);
    setScope(form, "filtered", total);
  }

  function clearAll() {
    toggleAllOnPage(false);
  }

  return (
    <>
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-white/70">
        <input
          ref={inputRef}
          type="checkbox"
          checked={checked}
          disabled={count === 0}
          onChange={(event) => toggleAllOnPage(event.target.checked)}
          className="h-4 w-4 accent-para-600"
          aria-label="Sélectionner tous les produits de cette page"
        />
        Tout sélectionner (page)
      </label>

      {checked && hasMore && (
        <p
          role="status"
          className="basis-full rounded-lg border border-para-200 bg-para-50/70 px-3 py-2 text-xs text-para-900"
        >
          {allFiltered ? (
            <>
              <strong>Les {total} produits correspondant au filtre sont sélectionnés.</strong>{" "}
              <button type="button" onClick={clearAll} className="font-semibold underline underline-offset-2">
                Annuler la sélection
              </button>
            </>
          ) : (
            <>
              Les {count} produits de cette page sont sélectionnés.{" "}
              <button
                type="button"
                onClick={selectAllFiltered}
                className="font-semibold underline underline-offset-2"
              >
                Sélectionner les {total} produits correspondant au filtre
              </button>
            </>
          )}
        </p>
      )}
    </>
  );
}

/** Nombre de produits réellement visés par le bouton, au moment du clic. */
function selectionSize(form: HTMLFormElement | null | undefined): { count: number; filtered: boolean } {
  const scope = form?.querySelector<HTMLInputElement>('input[name="scope"]')?.value;
  if (scope === "filtered") {
    const total = Number(form?.querySelector<HTMLInputElement>('input[name="expectedCount"]')?.value || 0);
    return { count: total, filtered: true };
  }
  const boxes = form?.querySelectorAll<HTMLInputElement>('input[name="ids"]:checked') ?? [];
  return { count: boxes.length, filtered: false };
}

/**
 * Bouton d'action groupée.
 *
 * « Masquer », « À valider » et « Archiver » retirent des produits de la
 * boutique : sans confirmation, un clic à la place de « Publier » dépublie
 * silencieusement des dizaines de produits (c'est arrivé le 24/09, 89 produits
 * retirés de la vente sans que personne s'en aperçoive).
 */
export function BulkActionButton({
  action,
  label,
  removesFromShop,
}: {
  action: string;
  label: ReactNode;
  removesFromShop?: boolean;
}) {
  return (
    <button
      type="submit"
      name="bulkAction"
      value={action}
      onClick={(event) => {
        const { count, filtered } = selectionSize(event.currentTarget.closest("form"));
        if (count === 0) return;
        if (!removesFromShop && !filtered) return;
        const portee = filtered ? " correspondant au filtre (toutes les pages)" : "";
        const message = removesFromShop
          ? `Retirer ${count} produit(s)${portee} de la boutique ? Ils ne seront plus visibles ni commandables.`
          : `Publier ${count} produit(s)${portee} ? Ils deviendront visibles et commandables.`;
        if (!window.confirm(message)) event.preventDefault();
      }}
      className="btn-3d rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-white/70"
    >
      {label}
    </button>
  );
}

export function BulkDeleteProductButton() {
  return (
    <button
      type="submit"
      name="bulkAction"
      value="delete"
      onClick={(event) => {
        const form = event.currentTarget.closest("form");
        const { count: total, filtered } = selectionSize(form);
        const scope = filtered ? "filtered" : "page";
        // Une suppression portant sur tout un filtre mérite une confirmation chiffrée.
        const message =
          scope === "filtered"
            ? `Supprimer définitivement les ${total} produits correspondant au filtre, y compris ceux des autres pages ? Cette action est irréversible.`
            : "Supprimer définitivement les produits sélectionnés ? Cette action est irréversible.";
        if (!window.confirm(message)) {
          event.preventDefault();
          return;
        }
        if (scope === "filtered" && !window.confirm(`Confirmez une seconde fois : ${total} produits seront supprimés.`)) {
          event.preventDefault();
        }
      }}
      className="btn-3d rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
    >
      Supprimer
    </button>
  );
}
