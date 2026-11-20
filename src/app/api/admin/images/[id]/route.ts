import { route, readForm } from '@/lib/api';
import { Errors } from '@/lib/errors';
import { removeProductImage, replaceProductImage } from '@/modules/products/product-admin.service';
import { revalidateCatalog } from '@/lib/cache';

export const runtime = 'nodejs';

export const DELETE = route<{ id: string }>({ access: 'staff', permission: 'products.update' }, async ({ params, auth, ip }) => {
  await removeProductImage(params.id, { userId: auth!.user.id, ip });
  revalidateCatalog();
  return { deleted: true };
});

/** Replace: upload new asset, swap record, then delete the old asset only if nothing else references it. */
export const PUT = route<{ id: string }>({ access: 'staff', permission: ['products.update', 'media.upload'] }, async ({ req, params, auth, ip }) => {
  const f = (await readForm(req)).get('file');
  if (!(f instanceof File)) throw Errors.badRequest('No file received');
  const img = await replaceProductImage(params.id, f, { userId: auth!.user.id, ip });
  revalidateCatalog();
  return img;
});
