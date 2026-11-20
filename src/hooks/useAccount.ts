'use client';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api-client';
import { qk } from '@/lib/query-keys';
import type { Address, Order, OrderItem } from '@/types/domain';
import type { Paged } from './useCatalog';

export function useAddresses(enabled = true) {
  return useQuery({ queryKey: qk.addresses, queryFn: () => get<{ items: Address[] }>('/api/users/addresses'), enabled, select: (d) => d.items, staleTime: 5 * 60_000 });
}

export interface OrderSummaryDTO {
  id: string;
  orderNumber: string;
  status: Order['status'];
  paymentStatus: Order['paymentStatus'];
  totalPaise: number;
  createdAt: string;
}
export function useOrders(page: number) {
  return useQuery({ queryKey: qk.orders.list(page), queryFn: () => get<Paged<OrderSummaryDTO>>('/api/orders', { page, limit: 10 }), staleTime: 30_000 });
}

export interface OrderDetailDTO {
  order: Omit<Order, 'createdAt' | 'updatedAt' | 'statusHistory'> & { createdAt: string; updatedAt: string; statusHistory: { status: Order['status']; at: string; note?: string }[] };
  items: OrderItem[];
  payment: { status: string; method?: string } | null;
}
export function useOrder(id: string, poll = false) {
  return useQuery({
    queryKey: qk.orders.detail(id),
    queryFn: () => get<OrderDetailDTO>(`/api/orders/${id}`),
    staleTime: 10_000,
    refetchInterval: (q) => (poll && q.state.data?.order.status === 'payment_pending' ? 4000 : false), // waits for webhook confirmation
  });
}
