'use client';
import { keepPreviousData, useQuery, type QueryClient } from '@tanstack/react-query';
import { get } from '@/lib/api-client';
import { qk } from '@/lib/query-keys';
import type { ProductCardDTO, ProductDetailDTO } from '@/modules/products/catalog.service';

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId: string | null;
  image?: { url: string };
  productCount: number;
}

export type ProductParams = Record<string, string | number | boolean | undefined>;

export const fetchProducts = (params: ProductParams) => get<Paged<ProductCardDTO>>('/api/products', params);

/**
 * initialData = the page the server already rendered for exactly these params. Pass it ONLY when params equal the
 * server's params (TanStack applies initialData to whatever key the query has).
 */
export function useProducts(params: ProductParams, enabled = true, initialData?: Paged<ProductCardDTO>) {
  return useQuery({
    queryKey: qk.products.list(params),
    queryFn: () => fetchProducts(params),
    placeholderData: keepPreviousData, // keeps the grid on screen while filters/pages change
    staleTime: 60_000,
    enabled,
    initialData,
  });
}

/** Warm the cache for the next page so pressing 'next' feels instant. */
export function prefetchProducts(qc: QueryClient, params: ProductParams) {
  return qc.prefetchQuery({ queryKey: qk.products.list(params), queryFn: () => fetchProducts(params), staleTime: 60_000 });
}

export function useProductDetail(slug: string | null) {
  return useQuery({
    queryKey: qk.products.detail(slug ?? ''),
    queryFn: () => get<ProductDetailDTO>(`/api/products/${slug}`),
    enabled: Boolean(slug),
    staleTime: 2 * 60_000,
  });
}

/** initial = categories the server already loaded (seeds the shared cache so no extra request is made). */
export function useCategories(enabled = true, initial?: CategoryDTO[]) {
  return useQuery({ queryKey: qk.categories, queryFn: () => get<{ items: CategoryDTO[] }>('/api/categories'), staleTime: 10 * 60_000, select: (d) => d.items, enabled, initialData: initial ? { items: initial } : undefined });
}

export function useProductsByIds(ids: string[]) {
  return useQuery({
    queryKey: qk.products.byIds(ids),
    queryFn: () => get<{ items: ProductCardDTO[] }>('/api/products/by-ids', { ids: ids.join(',') }),
    enabled: ids.length > 0,
    select: (d) => d.items,
  });
}

export function useSuggestions(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: qk.products.suggest(term),
    queryFn: () => get<{ products: { name: string; slug: string }[]; categories: { name: string; slug: string }[] }>('/api/search/suggest', { q: term }),
    enabled: term.length >= 2,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}
