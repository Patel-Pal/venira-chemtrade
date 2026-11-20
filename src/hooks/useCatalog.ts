'use client';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
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

export function useProducts(params: ProductParams, enabled = true) {
  return useQuery({
    queryKey: qk.products.list(params),
    queryFn: () => get<Paged<ProductCardDTO>>('/api/products', params),
    placeholderData: keepPreviousData, // keeps the grid on screen while filters/pages change
    staleTime: 60_000,
    enabled,
  });
}

export function useProductDetail(slug: string | null) {
  return useQuery({
    queryKey: qk.products.detail(slug ?? ''),
    queryFn: () => get<ProductDetailDTO>(`/api/products/${slug}`),
    enabled: Boolean(slug),
    staleTime: 2 * 60_000,
  });
}

export function useCategories() {
  return useQuery({ queryKey: qk.categories, queryFn: () => get<{ items: CategoryDTO[] }>('/api/categories'), staleTime: 10 * 60_000, select: (d) => d.items });
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
