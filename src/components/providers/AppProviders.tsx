'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { MotionConfig } from 'framer-motion';
import { theme } from '@/theme/theme';
import { ApiError, get, post, put } from '@/lib/api-client';
import { qk } from '@/lib/query-keys';
import { useAuthStore, type SessionUser } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';
import { useWishlistStore } from '@/stores/wishlist.store';
import { useUiStore } from '@/stores/ui.store';

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000, // catalogue data is cheap to re-use for a minute
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        // Never retry client errors (4xx); retry transient failures twice with backoff.
        retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
        retryDelay: (n) => Math.min(1000 * 2 ** n, 8000),
      },
      mutations: { retry: false },
    },
  });
}

interface MeResponse {
  user: SessionUser | null;
  permissions?: string[];
  isStaff?: boolean;
  isSuperAdmin?: boolean;
}

/** Loads the session once, then reconciles guest cart / wishlist with the signed-in user's saved data. */
function SessionBootstrap() {
  const setSession = useAuthStore((s) => s.setSession);
  const setAnonymous = useAuthStore((s) => s.setAnonymous);
  const status = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.user?.id);
  const cartHydrated = useCartStore((s) => s.hydrated);
  const synced = useRef<string | null>(null);

  // The persisted cart is already loaded from localStorage at this point; mark it ready after hydration so
  // server and first client render match (no count shown until now).
  useEffect(() => {
    useCartStore.setState({ hydrated: true });
  }, []);

  const { data, isError, isSuccess } = useQuery({ queryKey: qk.me, queryFn: () => get<MeResponse>('/api/auth/me'), staleTime: 5 * 60_000 });

  useEffect(() => {
    if (isSuccess) {
      if (data?.user) setSession({ user: data.user, permissions: data.permissions, isStaff: data.isStaff, isSuperAdmin: data.isSuperAdmin });
      else setAnonymous();
    } else if (isError) setAnonymous();
  }, [data, isSuccess, isError, setSession, setAnonymous]);

  // Merge guest cart + wishlist into the account exactly once per signed-in user.
  useEffect(() => {
    if (status !== 'authenticated' || !userId || !cartHydrated || synced.current === userId) return;
    synced.current = userId;
    (async () => {
      try {
        const local = useCartStore.getState().items;
        const merged = await post<{ items: { variantId: string; quantity: number }[] }>('/api/cart', { items: local });
        useCartStore.getState().replace(merged.items);
        const wl = useWishlistStore.getState().productIds;
        for (const id of wl) await post('/api/wishlist', { productId: id }).catch(() => undefined);
        const server = await get<{ productIds: string[] }>('/api/wishlist');
        useWishlistStore.getState().replace(server.productIds);
      } catch {
        /* non-fatal: the guest cart remains usable */
      }
    })();
  }, [status, userId, cartHydrated]);

  // Debounced persistence of cart changes for signed-in users.
  useEffect(() => {
    if (status !== 'authenticated') return;
    let timer: ReturnType<typeof setTimeout>;
    const unsub = useCartStore.subscribe((s, prev) => {
      if (s.items === prev.items || synced.current !== userId) return;
      clearTimeout(timer);
      timer = setTimeout(() => put('/api/cart', { items: s.items }).catch(() => undefined), 800);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [status, userId]);

  // Clear per-user local data when the session ends.
  useEffect(() => {
    if (status === 'anonymous' && synced.current) {
      synced.current = null;
      useCartStore.getState().clear();
      useWishlistStore.getState().clear();
    }
  }, [status]);

  return null;
}

function Toaster() {
  const toast = useUiStore((s) => s.toast);
  const dismiss = useUiStore((s) => s.dismissToast);
  return (
    <Snackbar
      key={toast?.id}
      open={Boolean(toast)}
      autoHideDuration={3500}
      onClose={(_, reason) => reason !== 'clickaway' && dismiss()}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ bottom: { xs: 88, md: 24 } }}
    >
      {toast ? (
        <Alert onClose={dismiss} severity={toast.severity} variant="filled" sx={{ width: '100%', borderRadius: 3 }}>
          {toast.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}

export default function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: false }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* reducedMotion="user": all framer-motion animations honour the OS reduced-motion setting */}
        <MotionConfig reducedMotion="user">
          <QueryClientProvider client={client}>
            <SessionBootstrap />
            {children}
            <Toaster />
          </QueryClientProvider>
        </MotionConfig>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
