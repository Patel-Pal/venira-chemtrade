import { z } from 'zod';
import { route, parseBody, parseQuery } from '@/lib/api';
import { adminUserSchema, pageQuerySchema } from '@/schemas';
import { createStaff, listStaff } from '@/modules/users/admin-users.service';

export const GET = route({ access: 'staff', permission: 'admins.manage' }, async ({ req }) => {
  const q = parseQuery(req, pageQuerySchema.extend({ search: z.string().trim().max(80).optional() }));
  return listStaff(q);
});

export const POST = route({ access: 'staff', permission: 'admins.manage', limit: { bucket: 'admin-create', max: 20, windowMs: 60 * 60_000 } }, async ({ req, auth, ip }) => {
  const b = await parseBody(req, adminUserSchema);
  return createStaff(auth!, b, ip);
});
