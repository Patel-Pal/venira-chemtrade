import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { Errors } from '@/lib/errors';
import { getCustomerDetail, setCustomerBlocked } from '@/modules/users/admin-users.service';

export const GET = route<{ id: string }>({ access: 'staff', permission: 'customers.read' }, async ({ params }) => {
  const d = await getCustomerDetail(params.id);
  if (!d) throw Errors.notFound('Customer not found');
  return d;
});

export const PATCH = route<{ id: string }>({ access: 'staff', permission: 'customers.update' }, async ({ req, params, auth, ip }) => {
  const { blocked } = await parseBody(req, z.object({ blocked: z.boolean() }));
  await setCustomerBlocked(auth!, params.id, blocked, ip);
  return { blocked };
});
