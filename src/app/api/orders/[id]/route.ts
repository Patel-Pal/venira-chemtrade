import { route } from '@/lib/api';
import { Errors } from '@/lib/errors';
import { getOrderDetail } from '@/modules/orders/order.service';

/** Ownership enforced in the query itself (user id in the filter) - other customers' orders are simply "not found". */
export const GET = route<{ id: string }>({ access: 'user' }, async ({ params, auth }) => {
  const d = await getOrderDetail(params.id, auth!.user.id);
  if (!d) throw Errors.notFound('Order not found');
  return {
    order: d.order,
    items: d.items,
    payment: d.payments.at(-1) ? { status: d.payments.at(-1)!.status, method: d.payments.at(-1)!.method } : null,
  };
});
