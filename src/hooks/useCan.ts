'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Reactive permission check for hiding/showing UI. Returns false until the client has mounted and the session
 * has loaded, so server HTML and the first client render always match (no hydration mismatch).
 * This is purely cosmetic - the server enforces every permission on every request.
 */
export function useCan() {
  const status = useAuthStore((s) => s.status);
  const isSuper = useAuthStore((s) => s.isSuperAdmin);
  const permissions = useAuthStore((s) => s.permissions);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return useCallback((perm: string) => mounted && status === 'authenticated' && (isSuper || permissions.includes(perm)), [mounted, status, isSuper, permissions]);
}
