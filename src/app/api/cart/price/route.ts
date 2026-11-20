import { route, parseBody } from '@/lib/api';
import { cartPriceSchema } from '@/schemas';
import { priceCart } from '@/modules/orders/cart.service';

/** Authoritative cart pricing (works for guests and signed-in users). Display numbers always come from here. */
export const POST = route({ access: 'optional', limit: { bucket: 'cart-price', max: 120, windowMs: 60_000 } }, async ({ req, auth }) => {
  const body = await parseBody(req, cartPriceSchema);
  return priceCart({ ...body, userId: auth?.user.id });
});
