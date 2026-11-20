'use client';
import { create } from 'zustand';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roleKey: string;
  emailVerified: boolean;
}

interface AuthState {
  status: 'loading' | 'authenticated' | 'anonymous';
  user: SessionUser | null;
  permissions: string[];
  isStaff: boolean;
  isSuperAdmin: boolean;
  setSession: (s: { user: SessionUser; permissions?: string[]; isStaff?: boolean; isSuperAdmin?: boolean }) => void;
  setAnonymous: () => void;
  /** UI convenience only. The server enforces every permission. */
  can: (perm: string) => boolean;
}

/** Deliberately NOT persisted: the session lives in an HttpOnly cookie; nothing sensitive is kept in localStorage. */
export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,
  permissions: [],
  isStaff: false,
  isSuperAdmin: false,
  setSession: ({ user, permissions = [], isStaff = false, isSuperAdmin = false }) => set({ status: 'authenticated', user, permissions, isStaff, isSuperAdmin }),
  setAnonymous: () => set({ status: 'anonymous', user: null, permissions: [], isStaff: false, isSuperAdmin: false }),
  can: (perm) => get().isSuperAdmin || get().permissions.includes(perm),
}));
