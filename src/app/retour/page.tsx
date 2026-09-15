import type { Metadata } from "next";
import { ReturnRequestForm } from "@/components/return-form";

export const metadata: Metadata = {
  title: "Demande de retour — Para Beauregard",
  description: "Retournez un article conforme passé commande sur Para Beauregard : produit endommagé, erreur de référence, changement d'avis…",
  robots: { index: false },
};

export default function RetourPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-14">
      <div className="rounded-[2rem] border border-para-100 bg-gradient-to-b from-mint to-white p-8 shadow-soft sm:p-10">
        <p className="text-center text-4xl" aria-hidden>↩️</p>
        <h1 className="mt-4 text-center font-display text-3xl font-extrabold text-para-950">Demande de retour</h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Avez-vous reçu une commande <strong>livrée</strong> qui pose problème ? Créez une demande : elle sera traitée
          sous 48 h ouvrées et vous recevrez la réponse par email.
        </p>
        <ReturnRequestForm />
        <p className="mt-6 text-center text-xs text-slate-400">
          Une demande existe déjà pour cette commande ? Consultez votre boîte mail pour la réponse de notre équipe.
        </p>
      </div>
    </div>
  );
}