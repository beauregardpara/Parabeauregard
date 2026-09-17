"use client";

import { useState, useTransition } from "react";
import { submitContact, type ContactResult } from "@/lib/actions/contact";

export function ContactForm() {
  const [result, setResult] = useState<ContactResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const res = await submitContact(fd);
      setResult(res);
      if (res.ok) form.reset();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <input required name="name" placeholder="Votre nom *" aria-label="Nom"
          className="w-full rounded-xl border border-para-200 px-4 py-2.5 text-sm outline-none focus:border-para-400" />
        <input required type="email" name="email" placeholder="Votre email *" aria-label="Email"
          className="w-full rounded-xl border border-para-200 px-4 py-2.5 text-sm outline-none focus:border-para-400" />
      </div>
      <input type="tel" name="phone" placeholder="Téléphone (facultatif)" aria-label="Téléphone" autoComplete="tel"
        className="w-full rounded-xl border border-para-200 px-4 py-2.5 text-sm outline-none focus:border-para-400" />
      {/* Champ piège anti-spam, invisible pour les visiteurs */}
      <div aria-hidden="true" className="hidden">
        <label>
          Ne pas remplir
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <input name="subject" placeholder="Sujet (facultatif)" aria-label="Sujet"
        className="w-full rounded-xl border border-para-200 px-4 py-2.5 text-sm outline-none focus:border-para-400" />
      <textarea required name="message" rows={5} placeholder="Votre message *" aria-label="Message"
        className="w-full rounded-xl border border-para-200 px-4 py-2.5 text-sm outline-none focus:border-para-400" />

      {result && !result.ok && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600">
          {result.error}
        </p>
      )}
      {result && result.ok && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
          ✓ Merci, votre message a bien été envoyé. Nous vous répondrons rapidement.
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending}
          className="btn-shine btn-3d rounded-full bg-gradient-to-r from-para-500 to-para-700 px-8 py-3 font-semibold text-white shadow-lift disabled:opacity-60">
          {pending ? "Envoi en cours…" : "Envoyer le message"}
        </button>
      </div>
      <p className="text-xs text-slate-400">* Champs obligatoires — vos données restent confidentielles (loi 09-08).</p>
    </form>
  );
}
