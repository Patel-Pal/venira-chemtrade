import { getRepos } from '@/database/repositories';
import type { PageRecord } from '@/database/repositories/interfaces';
import { cached } from '@/lib/cache';

export const getPublishedPage = cached(
  async (slug: string): Promise<PageRecord | null> => {
    try {
      const repos = await getRepos();
      const r = await repos.pages.list({ page: 1, limit: 1, filter: { slug, isPublished: true } });
      return r.items[0] ?? null;
    } catch {
      return null;
    }
  },
  ['page'],
  60,
);
