import { z } from 'zod';
import { route, parseBody, readForm } from '@/lib/api';
import { AppError, Errors } from '@/lib/errors';
import { addProductImage, reorderProductImages } from '@/modules/products/product-admin.service';
import { idSchema } from '@/schemas';
import { IMAGE_RULES } from '@/services/cloudinary';
import { revalidateCatalog } from '@/lib/cache';

export const runtime = 'nodejs';

/** multipart/form-data with one or more `files`. Every file is size/type/magic-byte validated server-side. */
export const POST = route<{ id: string }>({ access: 'staff', permission: ['products.update', 'media.upload'], limit: { bucket: 'upload', max: 30, windowMs: 10 * 60_000 } }, async ({ req, params, auth, ip }) => {
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > IMAGE_RULES.maxBytes * IMAGE_RULES.maxPerProduct + 1_000_000) throw new AppError('Upload too large', 413, 'PAYLOAD_TOO_LARGE');
  const form = await readForm(req);
  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  if (!files.length) throw Errors.badRequest('No files received');
  if (files.length > IMAGE_RULES.maxPerProduct) throw Errors.badRequest(`Upload at most ${IMAGE_RULES.maxPerProduct} images at once`);
  const added = [];
  for (const f of files) added.push(await addProductImage(params.id, f, { userId: auth!.user.id, ip }));
  revalidateCatalog();
  return { images: added };
});

export const PUT = route<{ id: string }>({ access: 'staff', permission: 'products.update' }, async ({ req, params, auth, ip }) => {
  const { order } = await parseBody(req, z.object({ order: z.array(idSchema).max(20) }));
  await reorderProductImages(params.id, order, { userId: auth!.user.id, ip });
  revalidateCatalog();
  return { reordered: true };
});
