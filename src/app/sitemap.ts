import type { MetadataRoute } from 'next';
import { getRepos } from '@/database/repositories';

export const dynamic = 'force-dynamic';
const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = ['', '/products', '/categories', '/about', '/contact', '/faq', '/shipping-policy', '/return-refund-policy', '/privacy-policy', '/terms-and-conditions']
    .map((p) => ({ url: `${base}${p}`, changeFrequency: 'weekly', priority: p === '' ? 1 : 0.7 }));
  try {
    const repos = await getRepos();
    const [products, cats] = await Promise.all([repos.products.list({ page: 1, limit: 5000, status: 'published' }), repos.categories.list({ activeOnly: true })]);
    return [
      ...staticRoutes,
      ...cats.map((c) => ({ url: `${base}/products?category=${c.slug}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
      ...products.items.map((p) => ({ url: `${base}/products/${p.slug}`, lastModified: p.updatedAt, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ];
  } catch {
    return staticRoutes;
  }
}
