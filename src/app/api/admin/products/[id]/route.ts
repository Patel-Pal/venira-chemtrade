import { route, parseBody, parseQuery } from '@/lib/api';
import { z } from 'zod';
import { Errors } from '@/lib/errors';
import { requirePermission } from '@/lib/auth';
import { productInputSchema } from '@/schemas';
import { getAdminProduct, removeProduct, updateProduct } from '@/modules/products/product-admin.service';
import { revalidateCatalog } from '@/lib/cache';

type P = { id: string };

export const GET = route<P>({ access: 'staff', permission: 'products.read' }, async ({ params }) => {
  const p = await getAdminProduct(params.id);
  if (!p) throw Errors.notFound('Product not found');
  return p;
});

export const PUT = route<P>({ access: 'staff', permission: 'products.update' }, async ({ req, params, auth, ip }) => {
  const body = await parseBody(req, productInputSchema);
  const p = await updateProduct(params.id, body, { userId: auth!.user.id, ip });
  revalidateCatalog();
  return p;
});

export const DELETE = route<P>({ access: 'staff', permission: 'products.delete' }, async ({ req, params, auth, ip }) => {
  const { hard } = parseQuery(req, z.object({ hard: z.enum(['true', 'false']).default('false') }));
  if (hard === 'true') requirePermission(auth!, 'products.delete');
  const r = await removeProduct(params.id, { userId: auth!.user.id, ip }, hard === 'true');
  revalidateCatalog();
  return { result: r };
});
