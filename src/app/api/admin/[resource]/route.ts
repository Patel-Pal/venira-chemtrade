import { z } from 'zod';
import { route, parseBody, parseQuery } from '@/lib/api';
import { hasPermission } from '@/lib/auth';
import { Errors } from '@/lib/errors';
import { audit } from '@/modules/audit/audit.service';
import { RESOURCES, resourceCtx } from '@/modules/admin/resources';
import { pageQuerySchema } from '@/schemas';
import { revalidateCatalog } from '@/lib/cache';

export const GET = route<{ resource: string }>({ access: 'staff' }, async ({ req, params, auth }) => {
  const def = RESOURCES[params.resource];
  if (!def) throw Errors.notFound();
  if (!hasPermission(auth!, def.read)) throw Errors.forbidden();
  const q = parseQuery(req, pageQuerySchema.extend({ limit: z.coerce.number().int().min(1).max(200).default(50) }));
  const r = await def.list(await resourceCtx(), q);
  return { ...r, page: q.page, limit: q.limit };
});

export const POST = route<{ resource: string }>({ access: 'staff' }, async ({ req, params, auth, ip }) => {
  const def = RESOURCES[params.resource];
  if (!def) throw Errors.notFound();
  if (!hasPermission(auth!, def.write)) throw Errors.forbidden();
  const data = await parseBody(req, def.schema);
  const created = await def.create(await resourceCtx(), data);
  await audit({ userId: auth!.user.id, ip, action: `${def.auditType}.create`, resourceType: def.auditType, resourceId: created.id, after: data });
  revalidateCatalog();
  return created;
});
