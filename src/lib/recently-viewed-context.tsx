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

export type RecentlyViewedItem = {
  productId: number;
  slug: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  price: number;
  promoPrice: number | null;
  rating: number | null;
  reviewsCount: number;
  createdAt: number;
};

type RecentlyViewedState = {
  items: RecentlyViewedItem[];
  record: (item: Omit<RecentlyViewedItem, "createdAt">) => void;
};

const MAX_ITEMS = 8;
const RecentlyViewedContext = createContext<RecentlyViewedState | null>(null);
const STORAGE_KEY = "pb_recently_v1";

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as RecentlyViewedItem[]);
    } catch {}
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, initialized]);

  const record = useCallback((item: Omit<RecentlyViewedItem, "createdAt">) => {
    setItems((prev) => {
      const next = [ { ...item, createdAt: Date.now() }, ...prev.filter((i) => i.productId !== item.productId) ];
      return next.slice(0, MAX_ITEMS);
    });
  }, []);

  const value = useMemo(() => ({ items, record }), [items, record]);

  return <RecentlyViewedContext.Provider value={value}>{children}</RecentlyViewedContext.Provider>;
}

export function useRecentlyViewed(): RecentlyViewedState {
  const ctx = useContext(RecentlyViewedContext);
  if (!ctx) throw new Error("useRecentlyViewed doit être utilisé dans <RecentlyViewedProvider>");
  return ctx;
}