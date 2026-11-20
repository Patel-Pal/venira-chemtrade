import { route, parseBody } from '@/lib/api';
import { roleInputSchema } from '@/schemas';
import { deleteRole, updateRole } from '@/modules/users/admin-users.service';

export const PATCH = route<{ id: string }>({ access: 'staff', permission: 'roles.manage' }, async ({ req, params, auth, ip }) => {
  const b = await parseBody(req, roleInputSchema.pick({ name: true, description: true, permissions: true }).partial());
  return updateRole(auth!, params.id, b, ip);
});

export const DELETE = route<{ id: string }>({ access: 'staff', permission: 'roles.manage' }, async ({ params, auth, ip }) => {
  await deleteRole(auth!, params.id, ip);
  return { deleted: true };
});
