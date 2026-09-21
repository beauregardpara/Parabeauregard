"use client";

import { useEffect, useRef, useState } from "react";

export function SelectAllPageCheckbox({ count }: { count: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const form = inputRef.current?.closest("form");
    if (!form) return;
    const sync = () => {
      const boxes = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="ids"]'));
      setChecked(boxes.length > 0 && boxes.every((box) => box.checked));
    };
    form.addEventListener("change", sync);
    return () => form.removeEventListener("change", sync);
  }, []);

  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-white/70">
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        disabled={count === 0}
        onChange={(event) => {
          const form = inputRef.current?.closest("form");
          const boxes = form?.querySelectorAll<HTMLInputElement>('input[name="ids"]') ?? [];
          boxes.forEach((box) => {
            box.checked = event.target.checked;
            box.dispatchEvent(new Event("change", { bubbles: true }));
          });
          setChecked(event.target.checked);
        }}
        className="h-4 w-4 accent-para-600"
        aria-label="Sélectionner tous les produits de cette page"
      />
      Tout sélectionner (page)
    </label>
  );
}

export function BulkDeleteProductButton() {
  return (
    <button
      type="submit"
      name="bulkAction"
      value="delete"
      onClick={(event) => {
        if (!window.confirm("Supprimer définitivement les produits sélectionnés ? Cette action est irréversible.")) {
          event.preventDefault();
        }
      }}
      className="btn-3d rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
    >
      Supprimer
    </button>
  );
}
