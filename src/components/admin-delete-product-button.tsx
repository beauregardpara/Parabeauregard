"use client";

import { deleteProduct } from "@/lib/actions/admin";

export function AdminDeleteProductButton({ productId, productName }: { productId: number; productName: string }) {
  return (
    <form
      action={deleteProduct}
      onSubmit={(event) => {
        if (!window.confirm(`Supprimer définitivement « ${productName} » ? Cette action est irréversible.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={productId} />
      <button
        type="submit"
        className="btn-3d w-full rounded-xl border border-red-300 bg-white py-2.5 text-xs font-bold text-red-700 hover:bg-red-50"
      >
        Supprimer définitivement
      </button>
    </form>
  );
}
