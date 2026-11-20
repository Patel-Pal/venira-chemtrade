import { z } from 'zod';
import { route, parseQuery } from '@/lib/api';
import { getRepos } from '@/database/repositories';
import { ORDER_STATUSES } from '@/types/domain';
import { pageQuerySchema } from '@/schemas';

export const GET = route({ access: 'staff', permission: 'orders.read' }, async ({ req }) => {
  const q = parseQuery(req, pageQuerySchema.extend({
    search: z.string().trim().max(80).optional(),
    status: z.enum(ORDER_STATUSES).optional(),
    paymentStatus: z.enum(['unpaid', 'paid', 'failed', 'refunded', 'partially_refunded']).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }));
  const repos = await getRepos();
  return repos.orders.list(q);
});
