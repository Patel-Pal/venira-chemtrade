import { z } from 'zod';
import { route, parseQuery } from '@/lib/api';
import { getRepos } from '@/database/repositories';
import { pageQuerySchema } from '@/schemas';

/** Read-only. Audit records cannot be modified or deleted through any API. */
export const GET = route({ access: 'staff', permission: 'audit.read' }, async ({ req }) => {
  const q = parseQuery(req, pageQuerySchema.extend({
    userId: z.string().regex(/^[a-f0-9]{24}$/i).optional(), action: z.string().trim().max(60).optional(), resourceType: z.string().trim().max(40).optional(),
  }));
  const repos = await getRepos();
  const page = await repos.audit.list(q);
  const users = await Promise.all([...new Set(page.items.map((a) => a.userId).filter(Boolean) as string[])].map((id) => repos.users.findById(id)));
  return { ...page, items: page.items.map((a) => ({ ...a, userName: users.find((u) => u?.id === a.userId)?.name ?? null })) };
});
