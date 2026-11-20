import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),
  EMAIL_PROVIDER_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().optional().default('Venira Chemtrade <no-reply@localhost>'),
  CRON_SECRET: z.string().optional().default(''),
  CHECKOUT_RESERVATION_MINUTES: z.coerce.number().int().min(5).max(120).default(20),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

/** Lazily validated so `next build` does not need secrets, but any runtime use fails fast and clearly. */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${msg}`);
  }
  if (parsed.data.NODE_ENV === 'production') {
    const missing = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'].filter(
      (k) => !parsed.data[k as keyof Env],
    );
    if (missing.length) console.warn(`[env] Payment configuration incomplete: ${missing.join(', ')}`);
  }
  cached = parsed.data;
  return cached;
}

export const isRazorpayConfigured = () => {
  const e = getEnv();
  return Boolean(e.RAZORPAY_KEY_ID && e.RAZORPAY_KEY_SECRET);
};
export const isCloudinaryConfigured = () => {
  const e = getEnv();
  return Boolean(e.CLOUDINARY_CLOUD_NAME && e.CLOUDINARY_API_KEY && e.CLOUDINARY_API_SECRET);
};
