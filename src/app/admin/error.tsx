"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AdminError]", error);
  }, [error]);

  return (
    <div className="grid place-items-center py-28 text-center">
      <span className="text-6xl" aria-hidden>⚠️</span>
      <h1 className="mt-4 font-display text-3xl font-extrabold text-para-950">
        Erreur dans le panneau admin
      </h1>
      <p className="mt-2 max-w-md text-slate-500">
        Une erreur technique empêche l&apos;affichage de cette page.
      </p>
      {error.digest && (
        <p className="mt-2 rounded-xl bg-slate-100 px-4 py-2 font-mono text-xs text-slate-400">
          Réf. {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="btn-3d mt-6 rounded-full bg-gradient-to-r from-para-500 to-para-700 px-6 py-2.5 font-semibold text-white"
      >
        Réessayer
      </button>
    </div>
  );
}
