import { z } from 'zod';
import { route, parseQuery } from '@/lib/api';
import { getRepos } from '@/database/repositories';
import { pageQuerySchema } from '@/schemas';

export const GET = route({ access: 'staff', permission: 'reviews.moderate' }, async ({ req }) => {
  const q = parseQuery(req, pageQuerySchema.extend({ status: z.enum(['pending', 'approved', 'rejected']).optional() }));
  const repos = await getRepos();
  const [page, dist, overall] = await Promise.all([repos.reviews.list(q), repos.reviews.distribution(), repos.reviews.ratingStats()]);
  const products = await repos.products.findByIds([...new Set(page.items.map((r) => r.productId))]);
  return { ...page, items: page.items.map((r) => ({ ...r, productName: products.find((p) => p.id === r.productId)?.name })), distribution: dist, overall };
});
