import { v2 as cloudinary } from 'cloudinary';
import { getEnv, isCloudinaryConfigured } from '@/config/env';
import { AppError } from '@/lib/errors';

export const IMAGE_RULES = {
  maxBytes: 5 * 1024 * 1024,
  maxPerProduct: 10,
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as string[],
};

function configure() {
  if (!isCloudinaryConfigured()) throw new AppError('Image storage is not configured', 503, 'MEDIA_UNAVAILABLE');
  const e = getEnv();
  cloudinary.config({ cloud_name: e.CLOUDINARY_CLOUD_NAME, api_key: e.CLOUDINARY_API_KEY, api_secret: e.CLOUDINARY_API_SECRET, secure: true });
  return cloudinary;
}

/** Magic-byte sniffing so a renamed .exe cannot masquerade as an image. */
export function sniffImageType(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  if (buf.subarray(4, 8).toString() === 'ftyp' && ['avif', 'avis'].includes(buf.subarray(8, 12).toString())) return 'image/avif';
  return null;
}

export function validateImage(file: { size: number; type: string }, buf: Buffer): void {
  if (file.size > IMAGE_RULES.maxBytes) throw new AppError('Image must be 5 MB or smaller', 413, 'IMAGE_TOO_LARGE');
  if (!IMAGE_RULES.mimeTypes.includes(file.type)) throw new AppError('Only JPEG, PNG, WebP or AVIF images are allowed', 415, 'IMAGE_TYPE');
  const sniffed = sniffImageType(buf);
  if (!sniffed || sniffed !== file.type) throw new AppError('File content does not match an allowed image type', 415, 'IMAGE_TYPE');
}

export interface UploadedImage {
  publicId: string;
  url: string;
  format: string;
  width: number;
  height: number;
}

export async function uploadImage(buf: Buffer, folder: string): Promise<UploadedImage> {
  const c = configure();
  return new Promise((resolve, reject) => {
    c.uploader
      .upload_stream({ folder: `venira/${folder}`, resource_type: 'image', overwrite: false, unique_filename: true }, (err, res) => {
        if (err || !res) return reject(new AppError('Image upload failed', 502, 'UPLOAD_FAILED'));
        resolve({ publicId: res.public_id, url: res.secure_url, format: res.format, width: res.width, height: res.height });
      })
      .end(buf);
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  const c = configure();
  await c.uploader.destroy(publicId, { invalidate: true });
}

/** Parameters for a client-side signed direct upload (secret never leaves the server). */
export function signUploadParams(folder: string) {
  const c = configure();
  const e = getEnv();
  const timestamp = Math.round(Date.now() / 1000);
  const params = { folder: `venira/${folder}`, timestamp };
  const signature = c.utils.api_sign_request(params, e.CLOUDINARY_API_SECRET);
  return { ...params, signature, apiKey: e.CLOUDINARY_API_KEY, cloudName: e.CLOUDINARY_CLOUD_NAME };
}
