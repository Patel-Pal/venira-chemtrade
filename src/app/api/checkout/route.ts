import { route, parseBody } from '@/lib/api';
import { checkoutSchema } from '@/schemas';
import { createCheckout, releaseExpiredReservations } from '@/modules/orders/checkout.service';

/** Creates the pending order, reserves stock and opens a Razorpay order. All pricing is recomputed here. */
export const POST = route({ access: 'user', limit: { bucket: 'checkout', max: 15, windowMs: 10 * 60_000 } }, async ({ req, auth, ip }) => {
  const body = await parseBody(req, checkoutSchema);
  void releaseExpiredReservations(10).catch(() => undefined); // opportunistic cleanup of stale holds
  return createCheckout({ ...body, userId: auth!.user.id, ip });
});
