import { getRepos } from '@/database/repositories';
import { Errors } from '@/lib/errors';
import { sanitizeText } from '@/lib/security';
import { audit } from '../audit/audit.service';
import type { Review } from '@/types/domain';

async function recalc(productId: string) {
  const repos = await getRepos();
  const s = await repos.reviews.ratingStats(productId);
  await repos.products.setRating(productId, s.average, s.count);
}

export async function createReview(userId: string, productId: string, input: { rating: number; title?: string; body: string }) {
  const repos = await getRepos();
  const [user, product] = await Promise.all([repos.users.findById(userId), repos.products.findById(productId)]);
  if (!user || !product || product.status !== 'published') throw Errors.notFound('Product not found');
  const existing = await repos.reviews.list({ page: 1, limit: 1, productId, userId });
  if (existing.total > 0) throw Errors.conflict('You have already reviewed this product');
  const verified = await repos.orders.hasUserPurchased(userId, productId);
  return repos.reviews.create({
    productId, userId, userName: user.name.split(' ')[0] + (user.name.includes(' ') ? ` ${user.name.split(' ').at(-1)![0]}.` : ''),
    rating: input.rating, title: input.title ? sanitizeText(input.title, 100) : undefined, body: sanitizeText(input.body, 2000),
    status: 'pending', verifiedPurchase: verified,
  });
}

export async function moderateReview(id: string, status: Review['status'], actor: { userId: string; ip?: string }) {
  const repos = await getRepos();
  const r = await repos.reviews.setStatus(id, status);
  if (!r) throw Errors.notFound('Review not found');
  await recalc(r.productId);
  await audit({ userId: actor.userId, ip: actor.ip, action: `review.${status}`, resourceType: 'review', resourceId: id });
  return r;
}

export async function deleteReview(id: string, actor: { userId: string; ip?: string }) {
  const repos = await getRepos();
  const r = await repos.reviews.findById(id);
  if (!r) throw Errors.notFound('Review not found');
  await repos.reviews.delete(id);
  await recalc(r.productId);
  await audit({ userId: actor.userId, ip: actor.ip, action: 'review.delete', resourceType: 'review', resourceId: id });
}
