'use client';
import { useCallback } from 'react';
import { useCartStore } from '@/stores/cart.store';
import { useWishlistStore } from '@/stores/wishlist.store';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { del, post } from '@/lib/api-client';

export function useAddToCart() {
  const add = useCartStore((s) => s.add);
  const notify = useUiStore((s) => s.notify);
  return useCallback(
    (variantId: string, quantity = 1, name?: string) => {
      add(variantId, quantity);
      notify(name ? `${name} added to cart` : 'Added to cart');
    },
    [add, notify],
  );
}

export function useWishlist(productId: string) {
  const has = useWishlistStore((s) => s.productIds.includes(productId));
  const toggle = useWishlistStore((s) => s.toggle);
  const status = useAuthStore((s) => s.status);
  const notify = useUiStore((s) => s.notify);
  const onToggle = useCallback(async () => {
    const added = toggle(productId);
    notify(added ? 'Saved to wishlist' : 'Removed from wishlist', 'info');
    if (status === 'authenticated') {
      try {
        await (added ? post('/api/wishlist', { productId }) : del('/api/wishlist', { productId }));
      } catch {
        toggle(productId); // roll back optimistic update
        notify('Could not update wishlist', 'error');
      }
    }
  }, [toggle, productId, status, notify]);
  return { inWishlist: has, toggle: onToggle };
}
