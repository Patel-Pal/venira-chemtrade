import { route, parseBody } from '@/lib/api';
import { getRepos } from '@/database/repositories';
import { profileSchema } from '@/schemas';
import { audit } from '@/modules/audit/audit.service';

export const GET = route({ access: 'user' }, async ({ auth }) => {
  const u = auth!.user;
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, emailVerified: u.emailVerified, createdAt: u.createdAt };
});

export const PATCH = route({ access: 'user' }, async ({ req, auth, ip }) => {
  const body = await parseBody(req, profileSchema);
  const repos = await getRepos();
  const u = await repos.users.update(auth!.user.id, { name: body.name, phone: body.phone });
  await audit({ userId: auth!.user.id, ip, action: 'user.profile.update', resourceType: 'user', resourceId: auth!.user.id });
  return { id: u!.id, name: u!.name, phone: u!.phone };
});
