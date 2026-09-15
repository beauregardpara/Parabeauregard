"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, MessageCircle, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { FreeShippingProgress } from "@/components/free-shipping-progress";
import { formatPrice } from "@/lib/format";
import { useEscapeClose } from "@/lib/use-escape-close";

export type NavCategory = {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  children: { id: number; name: string; slug: string; icon: string | null }[];
};

type Suggestion = { id: number; name: string; slug: string; brand: string | null; imageUrl: string | null; price: number; promoPrice: number | null };

type SearchSuggestionsResponse = { query?: string; terms?: string[]; suggestions?: Suggestion[] };

export function Header({ categories }: { categories: NavCategory[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSug, setShowSug] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);
  const cart = useCart();

  useEscapeClose(catOpen, () => setCatOpen(false));
  useEscapeClose(mobileOpen, () => setMobileOpen(false));

  useEffect(() => {
    if (!q.trim()) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=6`);
        if (res.ok) {
          const data = (await res.json()) as SearchSuggestionsResponse;
          setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        } else {
          setSuggestions([]);
        }
      } catch {}
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setShowSug(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!q.trim()) return;
    setShowSug(false);
    router.push(`/recherche?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-para-100/80 bg-[#fffdfb]/95 backdrop-blur-xl">
      <div className="container-page flex h-20 items-center gap-4">
        <Link href="/" className="flex h-12 w-[170px] shrink-0 items-center sm:h-[52px] sm:w-[210px] lg:w-[240px]" aria-label="Parapharmacie Beauregard — accueil">
          <Image
            src="/brand/para-beauregard-official.png"
            alt="Parapharmacie Beauregard"
            width={1185}
            height={315}
            sizes="(max-width: 639px) 170px, (max-width: 1023px) 210px, 240px"
            className="h-full w-full object-contain object-left"
          />
        </Link>

        {/* Recherche */}
        <div ref={boxRef} className="relative hidden flex-1 lg:block">
          <form onSubmit={submitSearch} role="search">
            <div className="relative mx-auto w-full max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => setShowSug(true)}
                placeholder="Rechercher un produit, une marque, un besoin…"
                className="w-full rounded-full border border-para-100 bg-[#fdf6f1] py-3 pl-11 pr-4 outline-none transition focus:border-para-500 focus:bg-[#fffdfb]"
                aria-label="Rechercher un produit"
              />
            </div>
          </form>
          {showSug && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-para-100 bg-[#fffdfb] shadow-xl">
              {suggestions.map((s) => (
                <Link key={s.id} href={`/produits/${s.slug}`} onClick={() => setShowSug(false)}
                  className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-para-50">
                  <span className="relative h-11 w-11 overflow-hidden rounded-lg border border-para-100 bg-para-50">
                    {s.imageUrl && <Image src={s.imageUrl} alt="" fill sizes="44px" className="object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-slate-500">{s.brand}</span>
                  </span>
                  <span className="text-sm font-bold text-para-700">
                    {formatPrice(s.promoPrice ?? s.price)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Navigation principale">
          <div ref={catRef} className="relative"
            onMouseEnter={() => setCatOpen(true)}
            onMouseLeave={() => setCatOpen(false)}>
            <button className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-para-50 hover:text-para-800"
              aria-expanded={catOpen}
              aria-haspopup="menu"
              onClick={() => setCatOpen((v) => !v)}>
              Catégories <ChevronDown size={14} aria-hidden />
            </button>
            {catOpen && (
              <div className="absolute left-1/2 top-full z-50 w-max -translate-x-1/2 pt-2">
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 rounded-2xl border border-para-100/80 bg-[#fffdfb] p-4 shadow-xl">
                  {categories.map((c) => (
                    <div key={c.id} className="min-w-[190px]">
                        <Link href={`/categories/${c.slug}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-para-800 hover:bg-para-50"
                        onClick={() => setCatOpen(false)}>
                        <span aria-hidden>{c.icon ?? "🧴"}</span>{c.name}
                      </Link>
                      {c.children.slice(0, 5).map((ch) => (
                        <Link key={ch.id} href={`/categories/${ch.slug}`}
                          className="block rounded-lg px-9 py-1.5 text-[13px] text-slate-600 hover:text-para-700"
                          onClick={() => setCatOpen(false)}>
                          {ch.name}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Link href="/promotions" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-para-50 hover:text-coral-600">Promos</Link>
          <Link href="/nouveautes" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-para-50 hover:text-para-800">Nouveautés</Link>
        </nav>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link href="/compte" className="rounded-full p-2.5 text-slate-600 transition hover:bg-para-50" title="Mon compte" aria-label="Mon compte">
            <UserRound size={20} />
          </Link>
          <button onClick={() => cart.setOpen(true)} className="relative rounded-full p-2.5 text-slate-600 transition hover:bg-para-50" title="Panier" aria-label="Ouvrir le panier">
            <ShoppingBag size={20} />
            {cart.count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-para-700 px-1 text-[10px] font-bold text-white">
                {cart.count}
              </span>
            )}
          </button>
          <button onClick={() => setMobileOpen((v) => !v)} className="rounded-xl p-2 text-slate-600 transition hover:bg-para-50 md:hidden" aria-label="Menu" aria-expanded={mobileOpen}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Recherche mobile */}
      <div className="border-t border-para-100/60 px-4 py-2 md:hidden">
        <form onSubmit={submitSearch} role="search" className="flex items-center rounded-full border border-para-200 bg-[#fffdfb]">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…"
            className="w-full bg-transparent px-4 py-2 text-sm outline-none" aria-label="Rechercher un produit" />
          <button type="submit" className="px-4 text-base" aria-label="Lancer la recherche">🔍</button>
        </form>
      </div>

      {mobileOpen && (
        <nav className="border-t border-para-100 bg-[#fffdfb] px-4 py-3 lg:hidden" aria-label="Menu mobile">
          <p className="px-2 pb-1 text-xs font-bold uppercase tracking-wide text-para-500">Catégories</p>
          {categories.map((c) => (
            <details key={c.id} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-2 py-2 text-sm font-semibold hover:bg-para-50">
                <span><span aria-hidden className="mr-2">{c.icon ?? "🧴"}</span>{c.name}</span>
                <span className="transition group-open:rotate-180">▾</span>
              </summary>
              <div className="pb-2 pl-6">
                <Link href={`/categories/${c.slug}`} onClick={() => setMobileOpen(false)} className="block py-1.5 text-sm text-para-700">Tout voir</Link>
                {c.children.map((ch) => (
                  <Link key={ch.id} href={`/categories/${ch.slug}`} onClick={() => setMobileOpen(false)} className="block py-1.5 text-sm text-slate-600">{ch.name}</Link>
                ))}
              </div>
            </details>
          ))}
          <hr className="my-2 border-para-100" />
          <Link href="/promotions" onClick={() => setMobileOpen(false)} className="block rounded-lg px-2 py-2 text-sm font-semibold text-coral-600">Promotions</Link>
          <Link href="/nouveautes" onClick={() => setMobileOpen(false)} className="block rounded-lg px-2 py-2 text-sm font-semibold">Nouveautés</Link>
          <Link href="/compte" onClick={() => setMobileOpen(false)} className="block rounded-lg px-2 py-2 text-sm font-semibold">Mon compte</Link>
          <button type="button" onClick={() => { setMobileOpen(false); window.dispatchEvent(new Event("pb-open-chat")); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold text-para-700"><MessageCircle size={17} />Assistant beauté</button>
        </nav>
      )}

      <CartDrawer />
    </header>
  );
}

function CartDrawer() {
  const cart = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEscapeClose(cart.isOpen, () => cart.setOpen(false));

  useEffect(() => {
    if (!cart.isOpen) return;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [cart.isOpen]);

  useEffect(() => {
    if (cart.isOpen) {
      const dialog = closeRef.current?.closest("[role=dialog]");
      lastFocusedRef.current = document.activeElement as HTMLElement | null;
      const t = setTimeout(() => {
        if (dialog) (dialog as HTMLElement).focus();
        else closeRef.current?.focus();
      }, 0);
      return () => clearTimeout(t);
    }
    lastFocusedRef.current?.focus?.();
  }, [cart.isOpen]);

  useEffect(() => {
    if (!cart.isOpen) return;
    const dialog = closeRef.current?.closest("[role=dialog]") as HTMLElement | null;
    if (!dialog) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )].filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", onKeyDown);
    return () => dialog.removeEventListener("keydown", onKeyDown);
  }, [cart.isOpen]);

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        onClick={() => cart.setOpen(false)}
        inert={!cart.isOpen}
        data-cart-backdrop
        className={`fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300 ${cart.isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden
      />
      <div
        aria-hidden={!cart.isOpen}
        data-cart-layer
        className="pointer-events-none fixed inset-y-0 right-0 z-[110] h-[100dvh] w-full max-w-md overflow-hidden"
      >
      <aside
        inert={!cart.isOpen}
        aria-modal="true"
        role="dialog"
        aria-label="Panier"
        aria-labelledby="cart-drawer-title"
        tabIndex={-1}
        data-cart-drawer
        data-state={cart.isOpen ? "open" : "closed"}
        className={`flex h-[100dvh] w-full flex-col bg-[#fffdfb] shadow-2xl transition-transform duration-300 ease-out ${cart.isOpen ? "pointer-events-auto translate-x-0" : "pointer-events-none translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-para-100 px-5 py-4">
          <h2 id="cart-drawer-title" className="font-display text-lg font-bold text-para-900">Votre panier ({cart.count})</h2>
          <button ref={closeRef} onClick={() => cart.setOpen(false)} className="btn-3d rounded-full p-2 hover:bg-para-50" aria-label="Fermer le panier">✕</button>
        </div>

        {cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <span className="text-5xl" aria-hidden>🛒</span>
            <p className="font-medium text-slate-500">Votre panier est vide</p>
            <Link href="/promotions" onClick={() => cart.setOpen(false)}
              className="btn-3d btn-shine rounded-full bg-gradient-to-r from-para-500 to-para-700 px-6 py-2.5 text-sm font-semibold text-white">
              Découvrir les promos
            </Link>
          </div>
        ) : (
          <>
            <ul className="min-h-0 flex-1 divide-y divide-para-50 overflow-y-auto px-5">
              {cart.items.map((i) => (
                <li key={i.productId} className="flex gap-3 py-4">
                  <Link href={`/produits/${i.slug}`} onClick={() => cart.setOpen(false)} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-para-100 bg-para-50">
                    {i.imageUrl && <Image src={i.imageUrl} alt={i.name} fill sizes="64px" className="object-cover" />}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{i.name}</p>
                    <p className="text-sm text-para-700 font-bold">{formatPrice(i.price)}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <button onClick={() => cart.setQty(i.productId, i.qty - 1)} className="h-7 w-7 rounded-full border border-para-200 font-bold text-para-700 hover:bg-para-50" aria-label={`Retirer un ${i.name}`}>−</button>
                      <span className="w-8 text-center text-sm font-bold">{i.qty}</span>
                      <button onClick={() => cart.setQty(i.productId, i.qty + 1)} className="h-7 w-7 rounded-full border border-para-200 font-bold text-para-700 hover:bg-para-50" aria-label={`Ajouter un ${i.name}`}>+</button>
                      <button onClick={() => cart.remove(i.productId)} className="ml-auto text-xs text-slate-400 hover:text-red-500">Supprimer</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-para-100 bg-para-50/70 px-5 py-4">
              <FreeShippingProgress subtotal={cart.subtotal} />
              <div className="mt-3 flex justify-between text-sm"><span>Sous-total</span><strong>{formatPrice(cart.subtotal)}</strong></div>
              <p className="mt-1 text-xs text-slate-500">Frais de livraison calculés à l'étape suivante.</p>
              <Link href="/commander" onClick={() => cart.setOpen(false)}
                className="btn-3d btn-shine block rounded-full bg-gradient-to-r from-para-500 to-para-700 py-3 text-center font-semibold text-white shadow-soft">
                Passer commande →
              </Link>
            </div>
          </>
        )}
      </aside>
      </div>
    </>,
    document.body
  );
}
