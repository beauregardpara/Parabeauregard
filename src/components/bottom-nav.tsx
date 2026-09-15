"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Percent, Search, ShoppingBag, UserRound } from "lucide-react";
import { useCart } from "@/lib/cart-context";

/**
 * Navigation basse pour mobile : toujours accessible, un pouce suffit.
 * Masquée sur desktop (voir .bottom-nav dans globals.css).
 */
export function BottomNav() {
  const pathname = usePathname();
  const cart = useCart();
  const count = cart.items.length;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const items = [
    { href: "/", label: "Accueil", icon: Home },
    { href: "/promotions", label: "Promos", icon: Percent },
  ];

  return (
    <nav className="bottom-nav" aria-label="Navigation mobile">
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={isActive(href) ? "active" : ""}
          aria-current={isActive(href) ? "page" : undefined}
        >
          <Icon size={20} aria-hidden />
          {label}
        </Link>
      ))}

      <Link href="/recherche" aria-label="Rechercher" className={isActive("/recherche") ? "active" : ""}>
        <span className="relative">
          <span className="absolute -inset-3 rounded-full bg-para-700/10" aria-hidden />
          <Search size={20} aria-hidden />
        </span>
        Recherche
      </Link>

      <button onClick={() => cart.setOpen(true)} aria-label="Ouvrir le panier">
        <span className="relative">
          <ShoppingBag size={20} aria-hidden />
          {count > 0 && <span className="bn-count">{count}</span>}
        </span>
        Panier
      </button>

      <Link href="/compte" className={isActive("/compte") ? "active" : ""} aria-label="Mon compte">
        <UserRound size={20} aria-hidden />
        Compte
      </Link>
    </nav>
  );
}