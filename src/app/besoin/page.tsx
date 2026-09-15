import type { Metadata } from "next";
import Link from "next/link";
import { NEEDS } from "@/lib/needs";

export const metadata: Metadata = {
  title: "Nos univers de besoins",
  description:
    "Explorez nos sélections par besoin : peau sèche, imperfections, anti-âge, soin capillaire, énergie et bébé. Des produits choisis pour vos routines.",
  alternates: { canonical: "/besoin" },
};

export default function BesoinsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav aria-label="Fil d'ariane" className="mb-4 text-xs text-slate-500">
        <Link href="/" className="hover:text-para-700">Accueil</Link>
        <span className="mx-1.5">/</span>
        <span className="font-semibold text-para-800">Nos univers</span>
      </nav>

      <header className="mb-10">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-para-500">Par besoin</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-para-950 sm:text-4xl">Nos univers de besoins</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Une sélection de produits autour de vos préoccupations du quotidien, pour trouver plus vite ce qu'il vous faut.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {NEEDS.map((need) => (
          <Link
            key={need.slug}
            href={`/besoin/${need.slug}`}
            className="shine-card group relative flex min-h-full flex-col overflow-hidden rounded-3xl border border-para-100 bg-gradient-to-br from-white to-mint p-6 shadow-[var(--shadow-card)] transition-shadow hover:shadow-lift"
          >
            <h2 className="font-display text-lg font-bold text-para-900 transition group-hover:text-para-700">
              {need.title}
            </h2>
            <p className="mt-1 text-sm font-semibold text-para-500">{need.tagline}</p>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{need.description}</p>
            <span aria-hidden className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-para-700">
              Découvrir<span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}