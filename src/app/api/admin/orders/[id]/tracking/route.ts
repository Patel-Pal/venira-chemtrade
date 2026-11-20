import { route, parseBody } from '@/lib/api';
import { trackingSchema } from '@/schemas';
import { setTracking } from '@/modules/orders/order.service';

export const PUT = route<{ id: string }>({ access: 'staff', permission: 'orders.update' }, async ({ req, params, auth, ip }) => {
  const b = await parseBody(req, trackingSchema);
  return setTracking(params.id, b, { userId: auth!.user.id, ip });
});
