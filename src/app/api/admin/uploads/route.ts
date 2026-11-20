import { route, readForm } from '@/lib/api';
import { AppError, Errors } from '@/lib/errors';
import { IMAGE_RULES, uploadImage, validateImage } from '@/services/cloudinary';
import { audit } from '@/modules/audit/audit.service';

export const runtime = 'nodejs';

/** Generic single-image upload for banners / category images / logo. Returns Cloudinary public id + secure URL. */
export const POST = route({ access: 'staff', permission: 'media.upload', limit: { bucket: 'upload-single', max: 40, windowMs: 10 * 60_000 } }, async ({ req, auth, ip }) => {
  if (Number(req.headers.get('content-length') ?? 0) > IMAGE_RULES.maxBytes + 500_000) throw new AppError('Upload too large', 413, 'PAYLOAD_TOO_LARGE');
  const form = await readForm(req);
  const file = form.get('file');
  const folder = String(form.get('folder') ?? 'misc');
  if (!(file instanceof File)) throw Errors.badRequest('No file received');
  if (!['banners', 'categories', 'store', 'misc'].includes(folder)) throw Errors.badRequest('Invalid folder');
  const buf = Buffer.from(await file.arrayBuffer());
  validateImage({ size: file.size, type: file.type }, buf);
  const up = await uploadImage(buf, folder);
  await audit({ userId: auth!.user.id, ip, action: 'media.upload', resourceType: 'media', resourceId: up.publicId });
  return up;
});
