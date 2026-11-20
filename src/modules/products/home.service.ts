import { getRepos } from '@/database/repositories';
import { cached } from '@/lib/cache';
import { listPublicCategories, listPublicProducts, type ProductCardDTO } from './catalog.service';

export interface HomeData {
  categories: Awaited<ReturnType<typeof listPublicCategories>>;
  bestSellers: ProductCardDTO[];
  newArrivals: ProductCardDTO[];
  featured: ProductCardDTO[];
  latest: ProductCardDTO[];
  totalProducts: number;
  banners: { id: string; title?: string; subtitle?: string; ctaLabel?: string; ctaUrl?: string; imageUrl?: string; placement: string }[];
  reviews: { id: string; userName: string; rating: number; title?: string; body: string; verifiedPurchase: boolean }[];
}

const empty: HomeData = { categories: [], bestSellers: [], newArrivals: [], featured: [], latest: [], totalProducts: 0, banners: [], reviews: [] };

/** Every section is data-driven: sections without data (no best-sellers flagged, no reviews yet...) are simply omitted. */
export const getHomeData = cached(
  async (): Promise<HomeData> => {
    try {
      const repos = await getRepos();
      const [categories, best, fresh, feat, latest, banners, reviews] = await Promise.all([
        listPublicCategories(),
        listPublicProducts({ page: 1, limit: 8, bestSeller: true, sort: 'popularity' }),
        listPublicProducts({ page: 1, limit: 8, newArrival: true, sort: 'newest' }),
        listPublicProducts({ page: 1, limit: 8, featured: true }),
        listPublicProducts({ page: 1, limit: 8, sort: 'newest' }),
        repos.banners.list({ page: 1, limit: 20, filter: { isActive: true } }),
        repos.reviews.list({ page: 1, limit: 6, status: 'approved' }),
      ]);
      return {
        categories,
        bestSellers: best.items,
        newArrivals: fresh.items,
        featured: feat.items,
        latest: latest.items,
        totalProducts: latest.total,
        banners: banners.items.map((b) => ({ id: b.id, title: b.title, subtitle: b.subtitle, ctaLabel: b.ctaLabel, ctaUrl: b.ctaUrl, imageUrl: b.image?.url, placement: b.placement })),
        reviews: reviews.items.map((r) => ({ id: r.id, userName: r.userName, rating: r.rating, title: r.title, body: r.body, verifiedPurchase: r.verifiedPurchase })),
      };
    } catch (e) {
      console.error('[home] data load failed', e);
      return empty;
    }
  },
  ['home-data'],
  60,
);
