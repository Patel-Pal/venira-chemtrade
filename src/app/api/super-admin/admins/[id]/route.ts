import { route, parseBody } from '@/lib/api';
import { getRepos } from '@/database/repositories';
import { Errors } from '@/lib/errors';
import { adminUserUpdateSchema } from '@/schemas';
import { updateStaff } from '@/modules/users/admin-users.service';

export const GET = route<{ id: string }>({ access: 'staff', permission: 'admins.manage' }, async ({ params }) => {
  const repos = await getRepos();
  const u = await repos.users.findById(params.id);
  if (!u) throw Errors.notFound('Admin not found');
  const { passwordHash: _p, ...user } = u;
  const [sessions, activity] = await Promise.all([repos.sessions.listActiveForUser(params.id), repos.audit.list({ page: 1, limit: 25, userId: params.id })]);
  return { user, sessions, activity: activity.items };
});

export const PATCH = route<{ id: string }>({ access: 'staff', permission: 'admins.manage' }, async ({ req, params, auth, ip }) => {
  const b = await parseBody(req, adminUserUpdateSchema);
  return updateStaff(auth!, params.id, b, ip);
});
