/**
 * Server-side read caches for the public catalogue (Next data cache, tag `catalog`).
 *
 * - Shared by API routes AND pages, so a page visit also warms the API (and vice versa).
 * - Invalidated instantly by `revalidateCatalog()` whenever an admin edits catalogue data or stock changes,
 *   and by the TTL below as a safety net.
 * - Never cached: free-text search, price/rating filters, deep pages, empty results and "not found".
 *   Those inputs are attacker-controlled and unbounded, so caching them would let anyone fill the cache.
 *
 * Only import this from route handlers / server components (it needs the Next runtime).
 */
import { cached } from '@/lib/cache';
import {
  getProductDetail, getRelatedProducts, listPublicCategories, listPublicProducts,
  type ProductCardDTO, type ProductDetailDTO, type PublicProductQuery,
} from './catalog.service';
import type { Page } from '@/database/repositories/interfaces';

export const LIST_TTL = 60;
export const CATEGORIES_TTL = 300;
export const DETAIL_TTL = 60;
export const MAX_CACHED_PAGE = 50;

/** Thrown inside a cached loader to hand back a value WITHOUT storing it (errors are never cached). */
class SkipCache<T> extends Error {
  readonly skipCache = true;
  constructor(readonly value: T) {
    super('skip-cache');
    this.name = 'SkipCache';
  }
}
async function unwrap<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (e instanceof Error && (e as Partial<SkipCache<T>>).skipCache) return (e as SkipCache<T>).value;
    throw e;
  }
}

/** Browse-style queries only: bounded set of keys (category x sort x page x flags). */
export function isCacheableQuery(q: PublicProductQuery): boolean {
  return !q.q && q.minPrice === undefined && q.maxPrice === undefined && !q.minRating && q.page <= MAX_CACHED_PAGE && !q.excludeIds?.length;
}

const listLoader = cached(
  async (q: PublicProductQuery): Promise<Page<ProductCardDTO>> => {
    const r = await listPublicProducts(q);
    if (r.total === 0) throw new SkipCache(r); // unknown category etc. - don't store
    return r;
  },
  ['catalog:list'],
  LIST_TTL,
);

export function getProductList(q: PublicProductQuery): Promise<Page<ProductCardDTO>> {
  return isCacheableQuery(q) ? unwrap(() => listLoader(q)) : listPublicProducts(q);
}

const categoriesLoader = cached(async () => listPublicCategories(), ['catalog:categories'], CATEGORIES_TTL);
export const getCategories = () => categoriesLoader();

const detailLoader = cached(
  async (slug: string): Promise<ProductDetailDTO> => {
    const p = await getProductDetail(slug);
    if (!p) throw new SkipCache<ProductDetailDTO | null>(null);
    return p;
  },
  ['catalog:detail'],
  DETAIL_TTL,
);
export function getProduct(slug: string): Promise<ProductDetailDTO | null> {
  return unwrap<ProductDetailDTO | null>(() => detailLoader(slug));
}

const relatedLoader = cached(async (productId: string) => getRelatedProducts(productId, 8), ['catalog:related'], 120);
export const getRelated = (productId: string) => relatedLoader(productId);
