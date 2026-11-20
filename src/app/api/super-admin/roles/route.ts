import { route, parseBody } from '@/lib/api';
import { getRepos } from '@/database/repositories';
import { roleInputSchema } from '@/schemas';
import { createRole } from '@/modules/users/admin-users.service';
import { PERMISSIONS } from '@/constants/permissions';

export const GET = route({ access: 'staff', permission: 'roles.manage' }, async () => {
  const repos = await getRepos();
  const roles = await repos.roles.list();
  const counts = await Promise.all(roles.map((r) => repos.users.countByRole([r.key])));
  return { roles: roles.map((r, i) => ({ ...r, userCount: counts[i] })), permissions: Object.entries(PERMISSIONS).map(([key, description]) => ({ key, description })) };
});

export const POST = route({ access: 'staff', permission: 'roles.manage' }, async ({ req, auth, ip }) => {
  const b = await parseBody(req, roleInputSchema);
  return createRole(auth!, b, ip);
});
