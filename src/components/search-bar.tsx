"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useEscapeClose } from "@/lib/use-escape-close";

type Suggestion = {
  id: number;
  name: string;
  slug: string;
  brand: string | null;
  imageUrl: string | null;
  price: number;
  promoPrice: number | null;
};

type SearchSuggestionsResponse = { suggestions?: Suggestion[] };

/**
 * Barre de recherche du site.
 *
 * `inline` est la version posee dans l'en-tete a partir de 1024 px ; `bloc`
 * occupe toute la largeur sous l'en-tete en dessous. Les deux partagent le meme
 * composant : la version mobile n'avait ni suggestions, ni navigation au
 * clavier, et la tranche 768–1023 px n'affichait aucun champ.
 */
export function SearchBar({ variant }: { variant: "inline" | "bloc" }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [charge, setCharge] = useState(false);
  // -1 : aucune suggestion survolee au clavier, la saisie part telle quelle.
  const [actif, setActif] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const listeId = useId();

  const fermer = useCallback(() => { setOuvert(false); setActif(-1); }, []);
  useEscapeClose(ouvert, fermer);

  useEffect(() => {
    const requete = q.trim();
    if (!requete) { setSuggestions([]); setCharge(false); return; }
    setCharge(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(requete)}`);
        const data = res.ok ? ((await res.json()) as SearchSuggestionsResponse) : null;
        setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
      } catch {
        setSuggestions([]);
      } finally {
        setCharge(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) fermer();
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [fermer]);

  const lancer = (e?: React.FormEvent) => {
    e?.preventDefault();
    const requete = q.trim();
    if (!requete) return;
    fermer();
    router.push(`/recherche?q=${encodeURIComponent(requete)}`);
  };

  const ouvrirProduit = (s: Suggestion) => {
    fermer();
    router.push(`/produits/${s.slug}`);
  };

  const deroule = ouvert && q.trim().length > 0;

  const auClavier = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!deroule) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const pas = e.key === "ArrowDown" ? 1 : -1;
      // On repasse par -1 : la fleche doit toujours pouvoir rendre la main a la
      // saisie, pour lancer la recherche complete plutot qu'une suggestion.
      setActif((i) => {
        const suivant = i + pas;
        if (suivant < -1) return suggestions.length - 1;
        if (suivant >= suggestions.length) return -1;
        return suivant;
      });
      return;
    }
    if (e.key === "Enter" && actif >= 0 && suggestions[actif]) {
      e.preventDefault();
      ouvrirProduit(suggestions[actif]);
    }
  };

  const inline = variant === "inline";

  return (
    <div ref={boxRef} className={`relative ${inline ? "hidden flex-1 lg:block" : "w-full"}`}>
      <form onSubmit={lancer} role="search">
        <div className={`relative ${inline ? "mx-auto w-full max-w-xl" : "w-full"}`}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-para-600" size={18} aria-hidden />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOuvert(true); setActif(-1); }}
            onFocus={() => setOuvert(true)}
            onKeyDown={auClavier}
            placeholder="Rechercher un produit, une marque, un besoin…"
            className="w-full rounded-full border border-para-200 bg-white py-2.5 pl-11 pr-14 text-sm outline-none transition placeholder:text-para-900/60 focus:border-para-500"
            aria-label="Rechercher un produit"
            role="combobox"
            aria-expanded={deroule}
            aria-controls={listeId}
            aria-autocomplete="list"
            aria-activedescendant={actif >= 0 ? `${listeId}-${actif}` : undefined}
            autoComplete="off"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-para-800 text-white transition hover:bg-para-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-para-900"
            aria-label="Lancer la recherche"
          >
            <Search size={15} strokeWidth={2.2} aria-hidden />
          </button>
        </div>
      </form>

      {deroule && (
        <div
          id={listeId}
          role="listbox"
          aria-label="Suggestions de produits"
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-para-200/70 bg-white shadow-xl"
        >
          {suggestions.map((s, i) => (
            <Link
              key={s.id}
              id={`${listeId}-${i}`}
              role="option"
              aria-selected={i === actif}
              href={`/produits/${s.slug}`}
              onClick={fermer}
              onMouseEnter={() => setActif(i)}
              className={`flex items-center gap-3 px-3 py-2.5 transition ${i === actif ? "bg-para-50" : ""}`}
            >
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-para-100 bg-para-50">
                {s.imageUrl && <Image src={s.imageUrl} alt="" fill sizes="44px" className="object-cover" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{s.name}</span>
                <span className="text-xs text-slate-600">{s.brand}</span>
              </span>
              <span className="shrink-0 text-sm font-bold text-para-700">
                {formatPrice(s.promoPrice ?? s.price)}
              </span>
            </Link>
          ))}

          {suggestions.length === 0 && (
            <p className="px-4 py-3 text-sm text-para-900/75">
              {charge ? "Recherche en cours…" : "Aucune suggestion. Lancez la recherche pour voir tous les résultats."}
            </p>
          )}

          {/* Une suggestion ne montre que les huit premieres fiches : sans cette
              ligne, rien n'indiquait qu'il en existe d'autres. */}
          <button
            type="button"
            onClick={() => lancer()}
            className="flex w-full items-center gap-2 border-t border-para-100 px-4 py-2.5 text-left text-sm font-semibold text-para-800 transition hover:bg-para-50"
          >
            <Search size={14} aria-hidden />
            Voir tous les résultats pour « {q.trim()} »
          </button>
        </div>
      )}
    </div>
  );
}
