import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-xl place-items-center px-4 py-28 text-center">
      {/*
        Le layout racine est dynamique : son shell est déjà envoyé quand une page
        appelle `notFound()`, donc Next.js ne peut plus remplacer le statut 200
        déjà émis par un 404 sur les routes dynamiques (/produits/[slug], etc.).
        Ce `noindex` empêche les moteurs d'indexer ces URL inexistantes, qui sont
        en nombre illimité — c'est le préjudice réel du « soft 404 ».
      */}
      <meta name="robots" content="noindex, follow" />
      <span className="text-7xl" aria-hidden>🔍</span>
      <h1 className="mt-6 font-display text-4xl font-extrabold text-para-950">Page introuvable</h1>
      <p className="mt-3 max-w-md text-slate-600">
        La page que vous recherchez n&apos;existe pas ou a été déplacée.
        N&apos;hésitez pas à explorer notre boutique.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="btn-shine btn-3d rounded-full bg-gradient-to-r from-para-500 to-para-700 px-7 py-3 font-semibold text-white shadow-lift"
        >
          Retour à l&apos;accueil
        </Link>
        <Link
          href="/recherche"
          className="btn-3d rounded-full border border-para-300 bg-white px-7 py-3 font-semibold text-para-800 shadow-sm"
        >
          Rechercher un produit
        </Link>
      </div>
    </div>
  );
}
