import Link from "next/link";
import { ArrowRight, Lock, Truck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

const AIDE = [
  { href: "/livraison-retours", label: "Livraison" },
  { href: "/livraison-retours", label: "Retours & remboursements" },
  { href: "/faq", label: "FAQ" },
  { href: "/suivi-commande", label: "Suivi de commande" },
  { href: "/contact", label: "Nous contacter" },
];

const A_PROPOS = [
  { href: "/a-propos", label: "Notre histoire" },
  { href: "/marques", label: "Nos marques" },
  { href: "/promotions", label: "Promotions" },
  { href: "/nouveautes", label: "Nouveautés" },
];

const LEGAL = [
  { href: "/cgv", label: "CGV" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/mentions-legales", label: "Mentions légales" },
];

export function Footer({ categories }: { categories: { id: number; name: string; slug: string }[] }) {
  return (
    <footer className="mt-0 bg-para-900 text-white">
      {/* `min-w-0` sur les colonnes : sans cela, un libellé long (« Retours &
          remboursements ») empêche la colonne de rétrécir et fait déborder la grille. */}
      <div className="container-page grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.1fr_1fr_1.4fr] [&>*]:min-w-0">
        <div>
          <Link href="/" aria-label="Para Beauregard — pied de page"><BrandLogo dark /></Link>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Parapharmacie en ligne marocaine. Des soins authentiques, des conseils
            d&apos;experts et une livraison partout au Maroc.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white">Nos univers</h3>
          <ul className="mt-4 grid gap-2.5 text-sm text-white/70 [overflow-wrap:anywhere]">
            {categories.slice(0, 8).map((c) => (
              <li key={c.id}>
                <Link href={`/categories/${c.slug}`} className="transition hover:text-para-200">{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white">Aide &amp; services</h3>
          <ul className="mt-4 grid gap-2.5 text-sm text-white/70 [overflow-wrap:anywhere]">
            {AIDE.map((l) => (
              <li key={l.label}><Link href={l.href} className="transition hover:text-para-200">{l.label}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white">À propos</h3>
          <ul className="mt-4 grid gap-2.5 text-sm text-white/70 [overflow-wrap:anywhere]">
            {A_PROPOS.map((l) => (
              <li key={l.label}><Link href={l.href} className="transition hover:text-para-200">{l.label}</Link></li>
            ))}
            {LEGAL.map((l) => (
              <li key={l.label}><Link href={l.href} className="transition hover:text-para-200">{l.label}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white">Recevez nos offres et conseils beauté</h3>
          <p className="mt-4 text-sm leading-relaxed text-white/70">Une question sur votre routine ou nos nouveautés&nbsp;? Notre équipe vous répond.</p>
          <Link href="/contact" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#f4f1e7] px-5 text-xs font-bold text-para-950 transition hover:bg-white">
            Nous contacter <ArrowRight size={14} aria-hidden />
          </Link>
          <p className="mt-5 inline-flex items-center gap-2 text-xs text-white/70"><Lock size={13} aria-hidden />Commande sécurisée</p>
          <p className="mt-2 inline-flex items-center gap-2 text-xs text-white/70"><Truck size={14} aria-hidden />Paiement à la livraison</p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="container-page py-5 text-center text-xs text-white/55">
          © {new Date().getFullYear()} Para Beauregard — Parapharmacie en ligne au Maroc.
        </p>
      </div>
    </footer>
  );
}
