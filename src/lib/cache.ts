import { revalidateTag } from 'next/cache';
import { unstable_cache } from 'next/cache';

export const CATALOG_TAG = 'catalog';

/** Invalidate cached storefront data after any admin mutation. */
export function revalidateCatalog() {
  try {
    revalidateTag(CATALOG_TAG);
  } catch {
    /* not in a Next request context (scripts/tests) */
  }
}

/** Caches a server-side data loader for storefront pages (60s default) with tag-based invalidation. */
export function cached<A extends unknown[], R>(fn: (...args: A) => Promise<R>, key: string[], revalidate = 60) {
  return unstable_cache(fn, key, { tags: [CATALOG_TAG], revalidate });
}
