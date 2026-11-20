import { route } from '@/lib/api';
import { Errors } from '@/lib/errors';
import { getRepos } from '@/database/repositories';
import { ADMIN_TRANSITIONS, getOrderDetail } from '@/modules/orders/order.service';

export const GET = route<{ id: string }>({ access: 'staff', permission: 'orders.read' }, async ({ params, auth }) => {
  const d = await getOrderDetail(params.id);
  if (!d) throw Errors.notFound('Order not found');
  const repos = await getRepos();
  const refunds = (await Promise.all(d.payments.map((p) => repos.payments.listRefunds(p.id)))).flat();
  const canPay = auth!.permissions.has('payments.read') || auth!.isSuperAdmin;
  return {
    ...d,
    payments: canPay ? d.payments : [],
    refunds: canPay ? refunds : [],
    allowedTransitions: ADMIN_TRANSITIONS[d.order.status],
  };
});
