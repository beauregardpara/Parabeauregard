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

export type CartItem = {
  productId: number;
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
  qty: number;
  maxStock: number; // Infinity sérialisé comme -1
};

type CartState = {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartState | null>(null);
const STORAGE_KEY = "pb_cart_v1";

export function CartProvider({
  children,
  initialItems = [],
  serverSync,
}: {
  children: ReactNode;
  /** Panier initial côté serveur (client connecté) — prioritaire sur localStorage. */
  initialItems?: CartItem[];
  /** Rappel de synchronisation serveur (client connecté), invoqué à chaque mutation. */
  serverSync?: (items: { productId: number; qty: number }[]) => void;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const serverMode = initialItems.length > 0 || Boolean(serverSync);

  useEffect(() => {
    if (serverMode && initialItems.length > 0) {
      setItems(initialItems);
    } else {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setItems(JSON.parse(raw));
      } catch {}
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    if (serverSync) {
      const payload = items.map((i) => ({ productId: i.productId, qty: i.qty }));
      serverSync(payload);
    }
  }, [items, hydrated, serverSync]);

  const add = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId
            ? { ...i, qty: Math.min(i.qty + qty, i.maxStock < 0 ? 99 : i.maxStock) }
            : i
        );
      }
      return [...prev, { ...item, qty }];
    });
    setOpen(true);
  }, []);

  const setQty = useCallback((productId: number, qty: number) => {
    if (qty <= 0) {
      // Quantité à zéro → retirer l'article (au lieu de garder une ligne fantôme)
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, qty: Math.min(qty, i.maxStock < 0 ? 99 : i.maxStock) }
          : i
      )
    );
  }, []);

  const remove = useCallback((productId: number) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartState>(() => {
    const count = items.reduce((s, i) => s + i.qty, 0);
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
    return { items, count, subtotal, isOpen, setOpen, add, setQty, remove, clear };
  }, [items, isOpen, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans <CartProvider>");
  return ctx;
}
