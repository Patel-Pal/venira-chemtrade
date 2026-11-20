import { route, parseBody } from '@/lib/api';
import { hasPermission } from '@/lib/auth';
import { Errors } from '@/lib/errors';
import { audit } from '@/modules/audit/audit.service';
import { RESOURCES, resourceCtx } from '@/modules/admin/resources';
import { revalidateCatalog } from '@/lib/cache';

type P = { resource: string; id: string };

export const GET = route<P>({ access: 'staff' }, async ({ params, auth }) => {
  const def = RESOURCES[params.resource];
  if (!def) throw Errors.notFound();
  if (!hasPermission(auth!, def.read)) throw Errors.forbidden();
  const item = await def.get(await resourceCtx(), params.id);
  if (!item) throw Errors.notFound();
  return item;
});

export const PUT = route<P>({ access: 'staff' }, async ({ req, params, auth, ip }) => {
  const def = RESOURCES[params.resource];
  if (!def) throw Errors.notFound();
  if (!hasPermission(auth!, def.write)) throw Errors.forbidden();
  const ctx = await resourceCtx();
  const before = await def.get(ctx, params.id);
  if (!before) throw Errors.notFound();
  const data = await parseBody(req, def.schema);
  const updated = await def.update(ctx, params.id, data);
  if (!updated) throw Errors.notFound();
  await audit({ userId: auth!.user.id, ip, action: `${def.auditType}.update`, resourceType: def.auditType, resourceId: params.id, before, after: updated });
  revalidateCatalog();
  return updated;
});

export const DELETE = route<P>({ access: 'staff' }, async ({ params, auth, ip }) => {
  const def = RESOURCES[params.resource];
  if (!def) throw Errors.notFound();
  if (!hasPermission(auth!, def.write)) throw Errors.forbidden();
  const ctx = await resourceCtx();
  const before = await def.get(ctx, params.id);
  if (!before) throw Errors.notFound();
  await def.remove(ctx, params.id);
  await audit({ userId: auth!.user.id, ip, action: `${def.auditType}.delete`, resourceType: def.auditType, resourceId: params.id, before });
  revalidateCatalog();
  return { deleted: true };
});
