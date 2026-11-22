import { describe, expect, it } from 'vitest';
import { PAGE_SIZE, filtersFromSearch, toListParams } from '@/lib/list-params';
import { isCacheableQuery } from '@/modules/products/cached';
import { productQuerySchema } from '@/schemas';

describe('product list URL -> params (shared by server pre-render and client)', () => {
  it('plain /products maps to the default first page', () => {
    const { filters, page } = filtersFromSearch({});
    expect(toListParams(filters, page)).toEqual({ page: 1, limit: PAGE_SIZE, sort: 'newest' });
    // undefined values must not appear in the hashed query key
    expect(JSON.stringify(toListParams(filters, page))).toBe('{"page":1,"limit":12,"sort":"newest"}');
  });

  it('reads category, sort, page, price and flags from the URL', () => {
    const { filters, page } = filtersFromSearch({ category: 'actives', sort: 'price_asc', page: '3', minPrice: '500', inStock: 'true', minRating: '4' });
    expect(page).toBe(3);
    expect(toListParams(filters, page)).toEqual({ page: 3, limit: 12, sort: 'price_asc', category: 'actives', minPrice: '500', inStock: true, minRating: 4 });
  });

  it('ignores bad input instead of failing', () => {
    const { filters, page } = filtersFromSearch({ sort: 'DROP TABLE', page: '-5', minRating: 'abc' });
    expect(filters.sort).toBe('newest');
    expect(page).toBe(1);
    expect(filters.minRating).toBe(0);
    expect(filtersFromSearch({ q: ['a', 'b'] }).filters.q).toBe('a'); // repeated params: first wins
  });

  it('produces params the API schema accepts (what the server page validates)', () => {
    const { filters, page } = filtersFromSearch({ category: 'actives', minPrice: '500', inStock: 'true', minRating: '4', sort: 'rating' });
    const p = toListParams(filters, page);
    const parsed = productQuerySchema.safeParse({ ...p, inStock: p.inStock ? 'true' : undefined });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toMatchObject({ page: 1, limit: 12, category: 'actives', minPrice: 500, inStock: true, minRating: 4, sort: 'rating' });
  });
});

describe('server cache eligibility', () => {
  const base = { page: 1, limit: 12 };
  it('caches bounded browse queries only', () => {
    expect(isCacheableQuery({ ...base })).toBe(true);
    expect(isCacheableQuery({ ...base, category: 'actives', sort: 'popularity' })).toBe(true);
    expect(isCacheableQuery({ ...base, page: 50 })).toBe(true);
  });
  it('never caches free text, price/rating filters or deep pages (unbounded, attacker-controlled keys)', () => {
    expect(isCacheableQuery({ ...base, q: 'acid' })).toBe(false);
    expect(isCacheableQuery({ ...base, minPrice: 1 })).toBe(false);
    expect(isCacheableQuery({ ...base, maxPrice: 999 })).toBe(false);
    expect(isCacheableQuery({ ...base, minRating: 4 })).toBe(false);
    expect(isCacheableQuery({ ...base, page: 51 })).toBe(false);
    expect(isCacheableQuery({ ...base, excludeIds: ['a'.repeat(24)] })).toBe(false);
  });
});
