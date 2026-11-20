import { z } from 'zod';
import { route, parseQuery } from '@/lib/api';
import { getProductsByIds } from '@/modules/products/catalog.service';
import { idSchema } from '@/schemas';

/** Used by wishlist and "recently viewed": resolves ids to current, published product cards. */
export const GET = route({ access: 'none' }, async ({ req }) => {
  const { ids } = parseQuery(req, z.object({ ids: z.string().max(1000) }));
  const list = ids.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 40);
  const valid = list.filter((i) => idSchema.safeParse(i).success);
  return { items: await getProductsByIds(valid) };
});
