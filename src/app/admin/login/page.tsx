"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import { loginAdmin } from "@/lib/actions/admin";
import { LockKeyhole } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await loginAdmin(fd);
      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else setError(res.error ?? "Erreur");
    });
  }

  return (
    <div className="grid min-h-dvh place-items-center overflow-y-auto bg-para-950 px-4 py-8 [background-image:radial-gradient(circle_at_20%_10%,rgba(79,128,108,.28),transparent_34%),radial-gradient(circle_at_85%_90%,rgba(182,58,81,.18),transparent_38%)]">
      <div className="scene w-full max-w-md">
        <div className="card-3d rounded-[2rem] border border-white/15 bg-[#fffdfb] p-8 shadow-lift">
          <div className="mb-6 text-center">
            <BrandLogo className="mb-5 justify-center" />
            <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-coral-400 to-coral-600 text-white shadow-lift"><LockKeyhole size={21} /></span>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-para-600">Espace sécurisé</p>
            <h1 className="font-display text-2xl font-extrabold text-para-950">Administration</h1>
            <p className="text-sm text-slate-500">Para Beauregard — accès réservé</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <input
              name="email" type="email" required placeholder="Email administrateur"
              aria-label="Email"
              className="w-full rounded-xl border border-para-200 px-4 py-2.5 text-sm outline-none focus:border-para-400"
            />
            <input
              name="password" type="password" required placeholder="Mot de passe"
              aria-label="Mot de passe"
              className="w-full rounded-xl border border-para-200 px-4 py-2.5 text-sm outline-none focus:border-para-400"
            />
            {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600">{error}</p>}
            <button type="submit" disabled={pending}
              className="btn-shine btn-3d w-full rounded-full bg-gradient-to-r from-para-500 to-para-700 py-3 font-bold text-white shadow-lift disabled:opacity-60">
              {pending ? "Connexion…" : "Se connecter"}
            </button>
          </form>

          <Link href="/" className="mt-5 block text-center text-xs font-semibold text-para-700 hover:underline">← Retour à la boutique</Link>
          <p className="mt-3 text-center text-[10px] text-slate-400">Accès protégé · Ne partagez jamais vos identifiants.</p>
        </div>
      </div>
    </div>
  );
}
