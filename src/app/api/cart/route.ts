import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { getRepos } from '@/database/repositories';
import { cartLineSchema } from '@/schemas';
import { normalizeItems } from '@/modules/orders/cart.service';

/** Server-side persisted cart for signed-in users (variant ids + quantities only; prices are never stored). */
export const GET = route({ access: 'user' }, async ({ auth }) => {
  const repos = await getRepos();
  return { items: await repos.userData.getCart(auth!.user.id) };
});

export const PUT = route({ access: 'user' }, async ({ req, auth }) => {
  const { items } = await parseBody(req, z.object({ items: z.array(cartLineSchema).max(100) }));
  const repos = await getRepos();
  await repos.userData.replaceCart(auth!.user.id, normalizeItems(items));
  return { saved: true };
});

/** Merge guest cart into the saved cart after login, re-validating against current catalogue data. */
export const POST = route({ access: 'user' }, async ({ req, auth }) => {
  const { items } = await parseBody(req, z.object({ items: z.array(cartLineSchema).max(100) }));
  const repos = await getRepos();
  const saved = await repos.userData.getCart(auth!.user.id);
  const merged = normalizeItems([...saved, ...items]);
  const variants = await repos.products.findVariantsByIds(merged.map((m) => m.variantId));
  const valid = new Set(variants.filter((v) => v.isActive).map((v) => v.id));
  const finalItems = merged.filter((m) => valid.has(m.variantId));
  await repos.userData.replaceCart(auth!.user.id, finalItems);
  return { items: finalItems };
});
