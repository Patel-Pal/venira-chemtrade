import { route } from '@/lib/api';
import { customerCancel } from '@/modules/orders/order.service';

export const POST = route<{ id: string }>({ access: 'user' }, async ({ params, auth }) => {
  await customerCancel(params.id, auth!.user.id);
  return { cancelled: true };
});
