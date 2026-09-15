"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="mx-auto grid max-w-xl place-items-center px-4 py-28 text-center">
      <span className="text-7xl" aria-hidden>⚠️</span>
      <h1 className="mt-6 font-display text-4xl font-extrabold text-para-950">
        Une erreur est survenue
      </h1>
      <p className="mt-3 max-w-md text-slate-600">
        Nous avons rencontré un problème technique. Veuillez réessayer ou
        retourner à l&apos;accueil.
      </p>
      {error.digest && (
        <p className="mt-2 rounded-xl bg-slate-100 px-4 py-2 font-mono text-xs text-slate-500">
          Réf. {error.digest}
        </p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="btn-shine btn-3d rounded-full bg-gradient-to-r from-para-500 to-para-700 px-7 py-3 font-semibold text-white shadow-lift"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="btn-3d rounded-full border border-para-300 bg-white px-7 py-3 font-semibold text-para-800 shadow-sm"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
