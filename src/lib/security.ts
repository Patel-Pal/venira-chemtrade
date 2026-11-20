import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import { AppError, Errors } from './errors';

const BCRYPT_COST = 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, BCRYPT_COST);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

// Real bcrypt hash computed once, compared against when the user does not exist (uniform login timing).
let dummy: Promise<string> | null = null;
export const getDummyHash = () => (dummy ??= bcrypt.hash('not-a-real-password', BCRYPT_COST));

export const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function hmacSha256Hex(secret: string, payload: string | Buffer): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/** Strips markup and control characters from untrusted free text. Output is still escaped by React on render. */
export function sanitizeText(input: string, max = 5000): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}

/* ------------------------- In-memory sliding-window rate limiter ------------------------- */
/**
 * NOTE: per-instance memory. Good for a single node / dev. On serverless or multi-instance
 * deployments replace the store with Redis/Upstash (see docs/SECURITY.md).
 */
const buckets = new Map<string, number[]>();
export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    throw Errors.tooMany();
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
}

export function clientIp(req: Request): string {
  const xf = req.headers.get('x-forwarded-for');
  return (xf?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'unknown').trim().slice(0, 64);
}

export function assertSameOrigin(req: Request, appUrl: string): void {
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return;
  const origin = req.headers.get('origin');
  if (!origin) return; // non-browser clients (and same-origin fetch in some browsers) – cookies are SameSite=Lax
  const allowed = new Set([new URL(appUrl).origin, `${req.headers.get('x-forwarded-proto') ?? 'http'}://${req.headers.get('host')}`]);
  if (!allowed.has(origin)) throw new AppError('Cross-origin request blocked', 403, 'CSRF');
}

/** Only allow same-site relative redirects (prevents open redirects). */
export function safeRedirectPath(target: string | null | undefined, fallback = '/'): string {
  if (!target || !target.startsWith('/') || target.startsWith('//') || target.includes('\\')) return fallback;
  return target;
}
