import Link from "next/link";
import { MapPin, Mail, Phone } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { BUSINESS, BUSINESS_MAPS_URL } from "@/config/business";

export function Footer({ categories }: { categories: { id: number; name: string; slug: string }[] }) {
  return (
    <footer className="mt-16 border-t border-para-800 bg-para-950 text-white">
      {/* `min-w-0` sur les colonnes : sans cela, un libellé long (« Livraison &
          retours ») empêche la colonne de rétrécir et fait déborder la grille. */}
      <div className="container-page grid gap-10 py-12 md:grid-cols-4 [&>*]:min-w-0">
        <div>
          <Link href="/" aria-label="Para Beauregard — pied de page"><BrandLogo dark /></Link>
          <p className="mt-4 text-sm leading-6 text-white/65">
            Votre parapharmacie en ligne au Maroc : soins, beauté, hygiène et bien-être,
            avec des produits authentiques et un accompagnement simple.
          </p>
        </div>

        <div>
          <h3 className="font-display text-lg font-bold text-white">Nos univers</h3>
          <ul className="mt-4 grid gap-2 text-sm text-white/65 [overflow-wrap:anywhere]">
            {categories.slice(0, 6).map((c) => (
              <li key={c.id}><Link href={`/categories/${c.slug}`} className="transition hover:text-para-200">{c.name}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-display text-lg font-bold text-white">Aide</h3>
          <ul className="mt-4 grid gap-2 text-sm text-white/65 [overflow-wrap:anywhere]">
            <li><Link href="/promotions" className="transition hover:text-para-200">Promotions</Link></li>
            <li><Link href="/nouveautes" className="transition hover:text-para-200">Nouveautés</Link></li>
            <li><Link href="/faq" className="transition hover:text-para-200">FAQ</Link></li>
            <li><Link href="/livraison-retours" className="transition hover:text-para-200">Livraison & retours</Link></li>
            <li><Link href="/contact" className="transition hover:text-para-200">Contact</Link></li>
            <li><Link href="/a-propos" className="transition hover:text-para-200">À propos</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-display text-lg font-bold text-white">Légal & contact</h3>
          <ul className="mt-4 grid gap-2 text-sm text-white/65 [overflow-wrap:anywhere]">
            <li><Link href="/cgv" className="transition hover:text-para-200">CGV</Link></li>
            <li><Link href="/confidentialite" className="transition hover:text-para-200">Confidentialité</Link></li>
            <li><Link href="/mentions-legales" className="transition hover:text-para-200">Mentions légales</Link></li>
            <li><a className="inline-flex items-center gap-2 transition hover:text-para-200" href={`tel:${BUSINESS.phoneInternational}`}><Phone size={14} aria-hidden />{BUSINESS.phoneDisplay}</a></li>
            <li><a className="inline-flex items-center gap-2 transition hover:text-para-200" href={`mailto:${BUSINESS.email}`}><Mail size={14} aria-hidden />{BUSINESS.email}</a></li>
            <li><a className="inline-flex items-center gap-2 transition hover:text-para-200" href={BUSINESS_MAPS_URL} target="_blank" rel="noopener noreferrer"><MapPin size={14} aria-hidden />{BUSINESS.locationLabel}</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-5 text-center text-xs text-white/55">
        © {new Date().getFullYear()} Para Beauregard — Tous droits réservés · Paiement à la livraison partout au Maroc
      </div>
    </footer>
  );
}
