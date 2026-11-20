import { z } from 'zod';
import { route, parseBody, parseQuery } from '@/lib/api';
import { getRepos } from '@/database/repositories';
import { Errors } from '@/lib/errors';
import { pageQuerySchema, reviewInputSchema } from '@/schemas';
import { createReview } from '@/modules/reviews/review.service';

export const GET = route<{ slug: string }>({ access: 'none' }, async ({ req, params }) => {
  const repos = await getRepos();
  const p = await repos.products.findBySlug(params.slug);
  if (!p || p.status !== 'published') throw Errors.notFound('Product not found');
  const q = parseQuery(req, pageQuerySchema.extend({ limit: z.coerce.number().int().min(1).max(50).default(10) }));
  const [page, stats] = await Promise.all([repos.reviews.list({ ...q, productId: p.id, status: 'approved' }), repos.reviews.ratingStats(p.id)]);
  return {
    ...page,
    stats,
    items: page.items.map((r) => ({ id: r.id, userName: r.userName, rating: r.rating, title: r.title, body: r.body, verifiedPurchase: r.verifiedPurchase, createdAt: r.createdAt })),
  };
});

export const POST = route<{ slug: string }>({ access: 'user', limit: { bucket: 'review', max: 10, windowMs: 60 * 60_000 } }, async ({ req, params, auth }) => {
  const repos = await getRepos();
  const p = await repos.products.findBySlug(params.slug);
  if (!p) throw Errors.notFound('Product not found');
  const body = await parseBody(req, reviewInputSchema);
  await createReview(auth!.user.id, p.id, body);
  return { message: 'Thanks! Your review will appear once approved.' };
});
