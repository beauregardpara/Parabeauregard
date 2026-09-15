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

export type CompareItem = {
  id: number;
  slug: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  price: number;
  promoPrice: number | null;
};

export const COMPARE_MAX = 4;

type CompareState = {
  items: CompareItem[];
  ids: number[];
  count: number;
  isFull: boolean;
  toggle: (item: CompareItem) => "added" | "removed" | "full";
  remove: (id: number) => void;
  clear: () => void;
  has: (id: number) => boolean;
};

const CompareContext = createContext<CompareState | null>(null);
const STORAGE_KEY = "pb_compare_v1";

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const toggle = useCallback((item: CompareItem): "added" | "removed" | "full" => {
    let result: "added" | "removed" | "full" = "added";
    setItems((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      if (exists) {
        result = "removed";
        return prev.filter((i) => i.id !== item.id);
      }
      if (prev.length >= COMPARE_MAX) {
        result = "full";
        return prev;
      }
      return [...prev, item];
    });
    return result;
  }, []);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const has = useCallback((id: number) => items.some((i) => i.id === id), [items]);

  const value = useMemo<CompareState>(
    () => ({
      items,
      ids: items.map((i) => i.id),
      count: items.length,
      isFull: items.length >= COMPARE_MAX,
      toggle,
      remove,
      clear,
      has,
    }),
    [items, toggle, remove, clear, has]
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare(): CompareState {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare doit être utilisé dans <CompareProvider>");
  return ctx;
}
