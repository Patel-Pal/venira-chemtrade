'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface State {
  productIds: string[];
  push: (id: string) => void;
  clear: () => void;
}

export const useRecentlyViewedStore = create<State>()(
  persist(
    (set) => ({
      productIds: [],
      push: (id) => set((s) => ({ productIds: [id, ...s.productIds.filter((p) => p !== id)].slice(0, 12) })),
      clear: () => set({ productIds: [] }),
    }),
    { name: 'vc-recent', version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);

/** Recent search terms (kept separate, local only). */
interface SearchState {
  terms: string[];
  add: (t: string) => void;
  clear: () => void;
}
export const useRecentSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      terms: [],
      add: (t) => {
        const v = t.trim().slice(0, 60);
        if (v.length < 2) return;
        set((s) => ({ terms: [v, ...s.terms.filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, 6) }));
      },
      clear: () => set({ terms: [] }),
    }),
    { name: 'vc-recent-search', version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);
