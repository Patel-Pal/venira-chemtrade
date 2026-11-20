import { z } from 'zod';
import { route, parseQuery } from '@/lib/api';
import { pageQuerySchema } from '@/schemas';
import { listCustomers } from '@/modules/users/admin-users.service';

export const GET = route({ access: 'staff', permission: 'customers.read' }, async ({ req }) => {
  const q = parseQuery(req, pageQuerySchema.extend({ search: z.string().trim().max(80).optional(), status: z.enum(['active', 'blocked', 'pending']).optional() }));
  return listCustomers(q);
});
