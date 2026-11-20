'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface WishlistState {
  productIds: string[];
  has: (id: string) => boolean;
  /** Returns true when the product was added, false when removed. */
  toggle: (id: string) => boolean;
  replace: (ids: string[]) => void;
  clear: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      productIds: [],
      has: (id) => get().productIds.includes(id),
      toggle: (id) => {
        const exists = get().productIds.includes(id);
        set((s) => ({ productIds: exists ? s.productIds.filter((p) => p !== id) : [id, ...s.productIds] }));
        return !exists;
      },
      replace: (ids) => set({ productIds: ids }),
      clear: () => set({ productIds: [] }),
    }),
    { name: 'vc-wishlist', version: 1, storage: createJSONStorage(() => localStorage), partialize: (s) => ({ productIds: s.productIds }) },
  ),
);
