'use client';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { post } from '@/lib/api-client';
import { qk } from '@/lib/query-keys';
import { useCartStore } from '@/stores/cart.store';
import type { PricedCart } from '@/modules/orders/cart.service';

/** Server-authoritative cart pricing for the items in the local cart store. */
export function useCartPricing(shippingMethodId?: string) {
  const items = useCartStore((s) => s.items);
  const hydrated = useCartStore((s) => s.hydrated);
  const couponCode = useCartStore((s) => s.couponCode);
  const query = useQuery({
    queryKey: qk.cart.price(items, couponCode, shippingMethodId),
    queryFn: () => post<PricedCart>('/api/cart/price', { items, couponCode: couponCode || undefined, shippingMethodId }),
    enabled: hydrated && items.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 15_000, // prices/stock can change: keep this short
  });
  return { ...query, items, hydrated, couponCode };
}
