import { route, parseBody } from '@/lib/api';
import { verifyPaymentSchema } from '@/schemas';
import { verifyAndConfirm } from '@/modules/payments/payment.service';

export const POST = route({ access: 'user', limit: { bucket: 'verify-pay', max: 30, windowMs: 10 * 60_000 } }, async ({ req, auth }) => {
  const body = await parseBody(req, verifyPaymentSchema);
  return verifyAndConfirm(auth!.user.id, body);
});
