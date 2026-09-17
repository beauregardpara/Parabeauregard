"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { loginCustomer, registerCustomer } from "@/lib/actions/customer";
import { Check, ShieldCheck } from "lucide-react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);

  const inputCls =
    "w-full rounded-xl border border-para-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-para-400 focus:shadow-sm";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = mode === "login" ? await loginCustomer(fd) : await registerCustomer(fd);
      if (res.ok) {
        router.push("/compte");
        router.refresh();
      } else setError(res.error);
    });
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-8 px-4 py-12 lg:grid-cols-[0.85fr_1fr] lg:items-center lg:py-16">
      <aside className="hidden rounded-[2rem] bg-gradient-to-br from-para-800 to-para-950 p-8 text-white shadow-lift lg:block"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15"><ShieldCheck size={26} /></span><p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-para-200">Votre espace personnel</p><h2 className="mt-3 font-display text-3xl font-bold">Tout votre essentiel, au même endroit.</h2><ul className="mt-8 space-y-4 text-sm text-white/80">{['Suivez vos commandes simplement', 'Retrouvez vos favoris et adresses', 'Bénéficiez d’un parcours sécurisé'].map((item) => <li key={item} className="flex items-center gap-3"><Check size={17} className="text-para-300" />{item}</li>)}</ul></aside>
      <div>
      <div className="rounded-[2rem] border border-para-100 bg-white p-8 shadow-lift">
        <h1 className="text-center font-display text-2xl font-extrabold text-para-950">
          {mode === "login" ? "Connexion" : "Créer mon compte"}
        </h1>
        <p className="mt-1 mb-6 text-center text-sm text-slate-500">
          {mode === "login"
            ? "Retrouvez vos commandes et vos adresses."
            : "Suivez vos commandes et gagnez du temps à chaque achat."}
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "register" && (
            <>
              <input name="firstName" required placeholder="Prénom *" aria-label="Prénom" className={inputCls} />
              <input name="lastName" required placeholder="Nom *" aria-label="Nom" className={inputCls} />
              <input name="phone" type="tel" placeholder="Téléphone" aria-label="Téléphone" className={inputCls} />
            </>
          )}
          <input name="email" type="email" required placeholder="Email *" aria-label="Email" className={inputCls} />
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={mode === "register" ? 6 : undefined}
              placeholder="Mot de passe *"
              aria-label="Mot de passe"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className={`${inputCls} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-slate-400 transition hover:text-para-700 focus-visible:text-para-700"
            >
              <span aria-hidden>{showPassword ? "🙈" : "👁"}</span>
            </button>
          </div>
          {mode === "register" && (
            <p className="px-1 text-xs text-slate-400">6 caractères minimum.</p>
          )}
          {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">{error}</p>}
          <button type="submit" disabled={pending}
            className="btn-shine btn-3d w-full rounded-full bg-gradient-to-r from-para-500 to-para-700 py-3 font-bold text-white shadow-lift disabled:opacity-60">
            {pending ? "…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        {mode === "login" && (
          <p className="mt-4 text-center text-xs font-semibold">
            <Link href="/mot-de-passe/oublie" className="text-para-700 hover:underline">Mot de passe oublié ?</Link>
          </p>
        )}
        <p className="mt-5 text-center text-sm text-slate-500">
          {mode === "login" ? (
            <>Pas encore de compte ?{" "}
              <Link href="/compte/inscription" className="font-bold text-para-700 hover:underline">Inscrivez-vous</Link>
            </>
          ) : (
            <>Déjà client ?{" "}
              <Link href="/compte/connexion" className="font-bold text-para-700 hover:underline">Connectez-vous</Link>
            </>
          )}
        </p>
      </div>
      </div>
    </div>
  );
}
