"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type FavoriteItem = {
  productId: number;
  slug: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  price: number;
  promoPrice: number | null;
  rating: number | null;
  reviewsCount: number;
};

type FavoritesState = {
  ids: number[];
  list: FavoriteItem[];
  count: number;
  isFavorite: (productId: number) => boolean;
  toggle: (item: FavoriteItem) => void;
  remove: (productId: number) => void;
  clear: () => void;
};

const FavoritesContext = createContext<FavoritesState | null>(null);
const STORAGE_KEY = "pb_favs_v1";

export function FavoritesProvider({
  children,
  initialFavorites = [],
  serverSync,
}: {
  children: ReactNode;
  /** Favoris du compte (client connecté) côté serveur — source de vérité du mode connecté. */
  initialFavorites?: FavoriteItem[];
  /** Rappel de synchronisation serveur (client connecté), invoqué à chaque mutation. */
  serverSync?: (productId: number, active: boolean) => void;
}) {
  const [list, setList] = useState<FavoriteItem[]>([]);
  const [initialized, setInitialized] = useState(false);
  const serverMode = initialFavorites.length > 0 || Boolean(serverSync);

  // Hydratation : favoris du compte (initialFavorites) sinon localStorage.
  useEffect(() => {
    if (serverMode && initialFavorites.length > 0) {
      setList(initialFavorites);
      setInitialized(true);
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const local = raw ? (JSON.parse(raw) as FavoriteItem[]) : [];
      setList(local);
    } catch {
      setList([]);
    }
    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (serverMode) return; // le serveur est la source de vérité : pas d'écrasement localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }, [list, initialized, serverMode]);

  const isFavorite = useCallback((productId: number) => list.some((f) => f.productId === productId), [list]);

  const toggle = useCallback(
    (item: FavoriteItem) => {
      setList((prev) => {
        const exists = prev.some((f) => f.productId === item.productId);
        const next = exists ? prev.filter((f) => f.productId !== item.productId) : [...prev, item];
        if (serverSync) serverSync(item.productId, !exists);
        return next;
      });
    },
    [serverSync]
  );

  const remove = useCallback(
    (productId: number) => {
      setList((prev) => prev.filter((f) => f.productId !== productId));
      if (serverSync) serverSync(productId, false);
    },
    [serverSync]
  );

  const clear = useCallback(
    () => {
      setList([]);
      if (serverSync) {
        for (const f of list) serverSync(f.productId, false);
      }
    },
    [serverSync, list]
  );

  const value = useMemo<FavoritesState>(
    () => ({ ids: list.map((f) => f.productId), list, count: list.length, isFavorite, toggle, remove, clear }),
    [list, isFavorite, toggle, remove, clear]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesState {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites doit être utilisé dans <FavoritesProvider>");
  return ctx;
}