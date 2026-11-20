import { route, parseBody } from '@/lib/api';
import { getRepos } from '@/database/repositories';
import { addressSchema } from '@/schemas';
import { Errors } from '@/lib/errors';

export const PUT = route<{ id: string }>({ access: 'user' }, async ({ req, params, auth }) => {
  const body = await parseBody(req, addressSchema);
  const repos = await getRepos();
  const a = await repos.addresses.update(params.id, auth!.user.id, body);
  if (!a) throw Errors.notFound('Address not found');
  return a;
});

export const DELETE = route<{ id: string }>({ access: 'user' }, async ({ params, auth }) => {
  const repos = await getRepos();
  if (!(await repos.addresses.delete(params.id, auth!.user.id))) throw Errors.notFound('Address not found');
  return { deleted: true };
});
