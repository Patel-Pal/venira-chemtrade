import { route, parseBody } from '@/lib/api';
import { refundSchema } from '@/schemas';
import { refundOrder } from '@/modules/payments/payment.service';

export const POST = route<{ id: string }>({ access: 'staff', permission: 'orders.refund', limit: { bucket: 'refund', max: 20, windowMs: 10 * 60_000 } }, async ({ req, params, auth, ip }) => {
  const b = await parseBody(req, refundSchema);
  return refundOrder(params.id, b.amountPaise, b.reason, { userId: auth!.user.id, ip });
});
