"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { requestPasswordReset, resetPassword } from "@/lib/actions/customer";

const inputCls =
  "w-full rounded-xl border border-para-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-para-400 focus:shadow-sm";
const buttonCls =
  "btn-shine btn-3d w-full rounded-full bg-gradient-to-r from-para-500 to-para-700 py-3 font-bold text-white shadow-lift disabled:opacity-60";

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-12 lg:py-16">
      <div className="rounded-[2rem] border border-para-100 bg-white p-8 shadow-lift">
        <h1 className="text-center font-display text-2xl font-extrabold text-para-950">{title}</h1>
        <p className="mt-1 mb-6 text-center text-sm text-slate-500">{subtitle}</p>
        {children}
        <p className="mt-5 text-center text-sm text-slate-500">
          <Link href="/compte/connexion" className="font-bold text-para-700 hover:underline">Retour à la connexion</Link>
        </p>
      </div>
    </div>
  );
}

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await requestPasswordReset(fd);
      if (res.ok) setMessage(res.message);
      else setError(res.error);
    });
  }

  return (
    <Card title="Mot de passe oublié" subtitle="Indiquez l'email de votre compte pour recevoir un lien de réinitialisation.">
      {message ? (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <input name="email" type="email" required autoComplete="email" placeholder="Email *" aria-label="Email" className={inputCls} />
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">{error}</p>}
          <button type="submit" disabled={pending} className={buttonCls}>{pending ? "…" : "Envoyer le lien"}</button>
        </form>
      )}
    </Card>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await resetPassword(fd);
      if (res.ok) setDone(true);
      else setError(res.error);
    });
  }

  return (
    <Card title="Nouveau mot de passe" subtitle="Choisissez un nouveau mot de passe pour votre compte.">
      {done ? (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <input name="password" type="password" required minLength={6} autoComplete="new-password" placeholder="Nouveau mot de passe *" aria-label="Nouveau mot de passe" className={inputCls} />
          <input name="confirm" type="password" required minLength={6} autoComplete="new-password" placeholder="Confirmer le mot de passe *" aria-label="Confirmer le mot de passe" className={inputCls} />
          <p className="px-1 text-xs text-slate-500">6 caractères minimum.</p>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">
              {error}{" "}
              <Link href="/mot-de-passe/oublie" className="underline">Nouvelle demande</Link>
            </p>
          )}
          <button type="submit" disabled={pending} className={buttonCls}>{pending ? "…" : "Enregistrer"}</button>
        </form>
      )}
    </Card>
  );
}
