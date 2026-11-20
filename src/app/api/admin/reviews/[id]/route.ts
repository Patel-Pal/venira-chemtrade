import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { deleteReview, moderateReview } from '@/modules/reviews/review.service';
import { revalidateCatalog } from '@/lib/cache';

export const PATCH = route<{ id: string }>({ access: 'staff', permission: 'reviews.moderate' }, async ({ req, params, auth, ip }) => {
  const { status } = await parseBody(req, z.object({ status: z.enum(['approved', 'rejected', 'pending']) }));
  const r = await moderateReview(params.id, status, { userId: auth!.user.id, ip });
  revalidateCatalog();
  return r;
});

export const DELETE = route<{ id: string }>({ access: 'staff', permission: 'reviews.moderate' }, async ({ params, auth, ip }) => {
  await deleteReview(params.id, { userId: auth!.user.id, ip });
  revalidateCatalog();
  return { deleted: true };
});
