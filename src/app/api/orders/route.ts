import { route, parseQuery } from '@/lib/api';
import { getRepos } from '@/database/repositories';
import { pageQuerySchema } from '@/schemas';

export const GET = route({ access: 'user' }, async ({ req, auth }) => {
  const q = parseQuery(req, pageQuerySchema);
  const repos = await getRepos();
  const page = await repos.orders.list({ ...q, userId: auth!.user.id });
  return {
    ...page,
    items: page.items.map((o) => ({
      id: o.id, orderNumber: o.orderNumber, status: o.status, paymentStatus: o.paymentStatus, totalPaise: o.totalPaise, createdAt: o.createdAt,
    })),
  };
});
