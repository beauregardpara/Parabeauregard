import type { Metadata } from "next";
import Link from "next/link";
import { SearchRedirectForm } from "@/components/suivi-form";

export const metadata: Metadata = {
  title: "Suivre ma commande — Para Beauregard",
  description: "Suivez en temps réel l'état de votre commande Para Beauregard grâce à votre référence et votre jeton de suivi.",
  robots: { index: false },
};

export default function SuiviCommandePage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-14">
      <div className="rounded-[2rem] border border-para-100 bg-gradient-to-b from-mint to-white p-8 shadow-soft sm:p-10">
        <p className="text-center text-4xl" aria-hidden>📦</p>
        <h1 className="mt-4 text-center font-display text-3xl font-extrabold text-para-950">Suivre ma commande</h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Entrez la référence de votre commande (ex. <code>PB-2026-7FH3K2L1</code>) et le jeton reçu par email ou SMS.
        </p>

        <SearchRedirectForm />

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-center text-xs text-slate-500">
          <p>
            « Je n'ai plus mon jeton » ? Connectez-vous à votre compte pour retrouver vos commandes, ou contactez-nous via le{" "}
            <Link href="/contact" className="font-semibold text-para-600 hover:underline">formulaire de contact</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}