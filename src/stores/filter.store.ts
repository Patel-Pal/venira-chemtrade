'use client';
import { create } from 'zustand';

export type SortKey = 'newest' | 'price_asc' | 'price_desc' | 'popularity' | 'rating';

export interface Filters {
  q: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  minRating: number; // 0 = any
  sort: SortKey;
}

export const DEFAULT_FILTERS: Filters = { q: '', category: '', minPrice: '', maxPrice: '', inStock: false, minRating: 0, sort: 'newest' };

interface FilterState extends Filters {
  page: number;
  set: (patch: Partial<Filters>) => void;
  setPage: (p: number) => void;
  reset: () => void;
  hydrate: (f: Partial<Filters>) => void;
  activeCount: () => number;
}

export const useFilterStore = create<FilterState>((set, get) => ({
  ...DEFAULT_FILTERS,
  page: 1,
  set: (patch) => set({ ...patch, page: 1 }),
  setPage: (page) => set({ page }),
  reset: () => set({ ...DEFAULT_FILTERS, page: 1 }),
  hydrate: (f) => set({ ...DEFAULT_FILTERS, ...f, page: 1 }),
  activeCount: () => {
    const s = get();
    return [s.category, s.minPrice, s.maxPrice, s.inStock || '', s.minRating || ''].filter(Boolean).length;
  },
}));
