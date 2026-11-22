'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  variantId: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  couponCode: string;
  hydrated: boolean;
  setCoupon: (code: string) => void;
  add: (variantId: string, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  replace: (items: CartItem[]) => void;
  clear: () => void;
  count: () => number;
}

const MAX_QTY = 10_000;

/**
 * Persists ONLY variant ids + quantities. Prices, names, stock and totals are always re-fetched from the server
 * (POST /api/cart/price) so tampered or stale localStorage can never influence what is charged.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: '',
      hydrated: false,
      setCoupon: (couponCode) => set({ couponCode: couponCode.trim().toUpperCase() }),
      add: (variantId, quantity = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.variantId === variantId);
          if (existing) return { items: s.items.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + quantity) } : i)) };
          return { items: [...s.items, { variantId, quantity: Math.min(MAX_QTY, quantity) }] };
        }),
      setQuantity: (variantId, quantity) =>
        set((s) => ({ items: quantity <= 0 ? s.items.filter((i) => i.variantId !== variantId) : s.items.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.min(MAX_QTY, quantity) } : i)) })),
      remove: (variantId) => set((s) => ({ items: s.items.filter((i) => i.variantId !== variantId) })),
      replace: (items) => set({ items }),
      clear: () => set({ items: [], couponCode: '' }),
      count: () => get().items.reduce((n, i) => n + i.quantity, 0),
    }),
    {
      name: 'vc-cart',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items, couponCode: s.couponCode }),
      // NOTE: `hydrated` is flipped by <SessionBootstrap/> after React hydrates. localStorage is read synchronously when the
      // store is created, so an onRehydrateStorage callback would reference `useCartStore` before it is initialised and
      // fail silently, leaving the cart stuck on its loading state.
    },
  ),
);
