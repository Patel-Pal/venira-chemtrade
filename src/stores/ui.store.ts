'use client';
import { create } from 'zustand';

export type ToastSeverity = 'success' | 'info' | 'warning' | 'error';

interface UiState {
  menuOpen: boolean;
  filterOpen: boolean;
  searchOpen: boolean;
  quickViewSlug: string | null;
  toast: { id: number; message: string; severity: ToastSeverity } | null;
  setMenuOpen: (v: boolean) => void;
  setFilterOpen: (v: boolean) => void;
  setSearchOpen: (v: boolean) => void;
  openQuickView: (slug: string | null) => void;
  notify: (message: string, severity?: ToastSeverity) => void;
  dismissToast: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  menuOpen: false,
  filterOpen: false,
  searchOpen: false,
  quickViewSlug: null,
  toast: null,
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  setFilterOpen: (filterOpen) => set({ filterOpen }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  openQuickView: (quickViewSlug) => set({ quickViewSlug }),
  notify: (message, severity = 'success') => set({ toast: { id: Date.now(), message, severity } }),
  dismissToast: () => set({ toast: null }),
}));
