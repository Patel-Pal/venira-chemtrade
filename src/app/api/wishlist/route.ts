import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { getRepos } from '@/database/repositories';
import { idSchema } from '@/schemas';

export const GET = route({ access: 'user' }, async ({ auth }) => {
  const repos = await getRepos();
  return { productIds: await repos.userData.getWishlist(auth!.user.id) };
});

export const POST = route({ access: 'user' }, async ({ req, auth }) => {
  const { productId } = await parseBody(req, z.object({ productId: idSchema }));
  const repos = await getRepos();
  await repos.userData.addToWishlist(auth!.user.id, productId);
  return { productIds: await repos.userData.getWishlist(auth!.user.id) };
});

export const DELETE = route({ access: 'user' }, async ({ req, auth }) => {
  const { productId } = await parseBody(req, z.object({ productId: idSchema }));
  const repos = await getRepos();
  await repos.userData.removeFromWishlist(auth!.user.id, productId);
  return { productIds: await repos.userData.getWishlist(auth!.user.id) };
});
