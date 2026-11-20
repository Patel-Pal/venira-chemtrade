import { z } from 'zod';
import { route, parseBody, parseQuery } from '@/lib/api';
import { getRepos } from '@/database/repositories';
import { idSchema, pageQuerySchema } from '@/schemas';

export const GET = route({ access: 'staff' }, async ({ req }) => {
  const q = parseQuery(req, pageQuerySchema.extend({ limit: z.coerce.number().int().min(1).max(50).default(15) }));
  const repos = await getRepos();
  return repos.notifications.list({ ...q, filter: { audience: 'admin' } });
});

export const PATCH = route({ access: 'staff' }, async ({ req }) => {
  const { id } = await parseBody(req, z.object({ id: idSchema }));
  const repos = await getRepos();
  await repos.notifications.update(id, { readAt: new Date() });
  return { read: true };
});
