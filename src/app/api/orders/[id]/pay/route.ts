import { route } from '@/lib/api';
import { resumePayment } from '@/modules/orders/checkout.service';

export const POST = route<{ id: string }>({ access: 'user', limit: { bucket: 'pay', max: 20, windowMs: 10 * 60_000 } }, async ({ params, auth }) => {
  return resumePayment(auth!.user.id, params.id);
});
