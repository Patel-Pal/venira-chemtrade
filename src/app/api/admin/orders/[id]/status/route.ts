import { route, parseBody } from '@/lib/api';
import { requirePermission } from '@/lib/auth';
import { orderStatusSchema } from '@/schemas';
import { updateOrderStatus } from '@/modules/orders/order.service';

export const POST = route<{ id: string }>({ access: 'staff', permission: 'orders.update' }, async ({ req, params, auth, ip }) => {
  const b = await parseBody(req, orderStatusSchema);
  if (b.status === 'cancelled') requirePermission(auth!, 'orders.cancel');
  if (b.status === 'returned') requirePermission(auth!, 'orders.refund');
  return updateOrderStatus(params.id, b.status, b.note, { userId: auth!.user.id, ip });
});
