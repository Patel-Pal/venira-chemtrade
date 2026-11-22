/**
 * Single source of truth for how a product-list URL maps to filters and API params.
 * Used by BOTH the server page (to pre-render the first page) and the client list (to fetch more),
 * so their TanStack Query keys are identical and the server-rendered data is reused with no refetch.
 * Pure and dependency-free: safe to import from server and client code.
 */
export const PAGE_SIZE = 12;
export const SORT_KEYS = ['newest', 'price_asc', 'price_desc', 'popularity', 'rating'] as const;
export type SortKeyName = (typeof SORT_KEYS)[number];

export interface ListFilters {
  q: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  minRating: number; // 0 = any
  sort: SortKeyName;
}

// `type` (not interface) so it is assignable to the generic Record<string, ...> used by the API client.
export type ListParams = {
  page: number;
  limit: number;
  sort: SortKeyName;
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: true;
  minRating?: number;
};

/** Property order matters for stable query keys - keep it identical everywhere. */
export function toListParams(f: ListFilters, page: number): ListParams {
  return {
    page,
    limit: PAGE_SIZE,
    sort: f.sort,
    q: f.q || undefined,
    category: f.category || undefined,
    minPrice: f.minPrice || undefined,
    maxPrice: f.maxPrice || undefined,
    inStock: f.inStock || undefined,
    minRating: f.minRating || undefined,
  };
}

type SearchParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Mirrors what the client does when it reads the URL on first load. */
export function filtersFromSearch(sp: SearchParams): { filters: ListFilters; page: number } {
  const sort = first(sp.sort);
  return {
    filters: {
      q: first(sp.q) ?? '',
      category: first(sp.category) ?? '',
      minPrice: first(sp.minPrice) ?? '',
      maxPrice: first(sp.maxPrice) ?? '',
      inStock: first(sp.inStock) === 'true',
      minRating: Number(first(sp.minRating) ?? 0) || 0,
      sort: (SORT_KEYS as readonly string[]).includes(sort ?? '') ? (sort as SortKeyName) : 'newest',
    },
    page: Math.max(1, Number(first(sp.page) ?? 1) || 1),
  };
}
