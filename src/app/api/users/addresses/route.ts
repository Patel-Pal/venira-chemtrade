import { route, parseBody } from '@/lib/api';
import { getRepos } from '@/database/repositories';
import { addressSchema } from '@/schemas';
import { Errors } from '@/lib/errors';

export const GET = route({ access: 'user' }, async ({ auth }) => {
  const repos = await getRepos();
  return { items: await repos.addresses.listByUser(auth!.user.id) };
});

export const POST = route({ access: 'user' }, async ({ req, auth }) => {
  const body = await parseBody(req, addressSchema);
  const repos = await getRepos();
  const existing = await repos.addresses.listByUser(auth!.user.id);
  if (existing.length >= 20) throw Errors.badRequest('You can save up to 20 addresses');
  const first = existing.length === 0;
  return repos.addresses.create({ ...body, userId: auth!.user.id, isDefaultShipping: body.isDefaultShipping || first, isDefaultBilling: body.isDefaultBilling || first });
});
