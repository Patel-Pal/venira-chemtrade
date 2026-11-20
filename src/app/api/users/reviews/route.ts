import { route } from '@/lib/api';
import { getRepos } from '@/database/repositories';

export const GET = route({ access: 'user' }, async ({ auth }) => {
  const repos = await getRepos();
  const page = await repos.reviews.list({ page: 1, limit: 50, userId: auth!.user.id });
  const products = await repos.products.findByIds([...new Set(page.items.map((r) => r.productId))]);
  return { items: page.items.map((r) => ({ id: r.id, rating: r.rating, title: r.title, body: r.body, status: r.status, createdAt: r.createdAt, product: products.find((p) => p.id === r.productId) ? { name: products.find((p) => p.id === r.productId)!.name, slug: products.find((p) => p.id === r.productId)!.slug } : null })) };
});
