import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="grid place-items-center py-28 text-center">
      <span className="text-6xl" aria-hidden>🔍</span>
      <h1 className="mt-4 font-display text-3xl font-extrabold text-para-950">Page introuvable</h1>
      <p className="mt-2 text-slate-500">Cette page admin n&apos;existe pas.</p>
      <Link
        href="/admin"
        className="btn-3d mt-6 rounded-full bg-gradient-to-r from-para-500 to-para-700 px-6 py-2.5 font-semibold text-white"
      >
        Retour au tableau de bord
      </Link>
    </div>
  );
}
