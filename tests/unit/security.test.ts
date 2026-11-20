import { describe, expect, it } from 'vitest';
import { createHmac } from 'crypto';
import { verifyCheckoutSignature, verifyWebhookSignature } from '@/services/razorpay';
import { sanitizeText, rateLimit, safeRedirectPath, sha256 } from '@/lib/security';
import { ALL_PERMISSIONS, DEFAULT_ROLES } from '@/constants/permissions';
import { canTransition } from '@/modules/orders/order.service';
import { sniffImageType, validateImage } from '@/services/cloudinary';
import { productInputSchema, checkoutSchema, couponInputSchema, registerSchema } from '@/schemas';
import { safeNext } from '@/utils/url';
import { formatPaise, percentOf, rupeesToPaise } from '@/utils/money';
import { generateSku, slugify } from '@/utils/slug';
import { resolveRange } from '@/modules/analytics/analytics.service';

const hmac = (secret: string, data: string) => createHmac('sha256', secret).update(data).digest('hex');

describe('Razorpay signatures', () => {
  const secret = 'test_secret_value';
  it('accepts a valid checkout signature and rejects tampering', () => {
    const sig = hmac(secret, 'order_ABC|pay_XYZ');
    expect(verifyCheckoutSignature('order_ABC', 'pay_XYZ', sig, secret)).toBe(true);
    expect(verifyCheckoutSignature('order_ABC', 'pay_OTHER', sig, secret)).toBe(false);
    expect(verifyCheckoutSignature('order_ABC', 'pay_XYZ', sig.replace(/.$/, '0'), secret)).toBe(false);
    expect(verifyCheckoutSignature('order_ABC', 'pay_XYZ', sig, '')).toBe(false);
  });
  it('verifies webhook signatures against the raw body', () => {
    const body = '{"event":"payment.captured","payload":{}}';
    const sig = hmac('whsec', body);
    expect(verifyWebhookSignature(body, sig, 'whsec')).toBe(true);
    expect(verifyWebhookSignature(body + ' ', sig, 'whsec')).toBe(false); // re-serialised JSON would fail
    expect(verifyWebhookSignature(body, null, 'whsec')).toBe(false);
  });
});

describe('RBAC definitions', () => {
  it('super admin holds every permission; customers hold none', () => {
    expect(DEFAULT_ROLES.find((r) => r.key === 'super_admin')!.permissions).toEqual(ALL_PERMISSIONS);
    expect(DEFAULT_ROLES.find((r) => r.key === 'customer')!.permissions).toHaveLength(0);
  });
  it('plain admin cannot manage admins, roles, audit or system', () => {
    const admin = DEFAULT_ROLES.find((r) => r.key === 'admin')!.permissions;
    for (const p of ['admins.manage', 'roles.manage', 'audit.read', 'system.manage'] as const) expect(admin).not.toContain(p);
  });
  it('scoped roles only receive their own modules', () => {
    const inv = DEFAULT_ROLES.find((r) => r.key === 'inventory_manager')!.permissions;
    expect(inv).toContain('inventory.adjust');
    expect(inv).not.toContain('orders.update');
    expect(DEFAULT_ROLES.find((r) => r.key === 'order_manager')!.permissions).not.toContain('products.delete');
  });
});

describe('order transitions', () => {
  it('forbids marking unpaid orders confirmed and reviving terminal orders', () => {
    expect(canTransition('payment_pending', 'confirmed')).toBe(false);
    expect(canTransition('cancelled', 'processing')).toBe(false);
    expect(canTransition('confirmed', 'processing')).toBe(true);
    expect(canTransition('delivered', 'returned')).toBe(true);
    expect(canTransition('shipped', 'refunded')).toBe(false);
  });
});

describe('upload validation', () => {
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20)]);
  const exe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(30)]);
  it('sniffs real image types', () => {
    expect(sniffImageType(jpeg)).toBe('image/jpeg');
    expect(sniffImageType(exe)).toBeNull();
  });
  it('rejects wrong mime, oversize and spoofed content', () => {
    expect(() => validateImage({ size: 100, type: 'image/jpeg' }, jpeg)).not.toThrow();
    expect(() => validateImage({ size: 100, type: 'image/gif' }, jpeg)).toThrow();
    expect(() => validateImage({ size: 6 * 1024 * 1024, type: 'image/jpeg' }, jpeg)).toThrow();
    expect(() => validateImage({ size: 100, type: 'image/jpeg' }, exe)).toThrow();
  });
});

describe('validation schemas', () => {
  it('product schema applies defaults and strips unknown fields (mass-assignment safe)', () => {
    const r = productInputSchema.parse({ name: 'Niacinamide', categoryId: 'a'.repeat(24), ratingAverage: 5, salesCount: 999, isAdmin: true });
    expect(r).not.toHaveProperty('ratingAverage');
    expect(r).not.toHaveProperty('salesCount');
    expect(r.status).toBe('draft');
    expect(r.variants).toEqual([]);
  });
  it('rejects NoSQL operator objects where ids are expected', () => {
    expect(productInputSchema.safeParse({ name: 'x', categoryId: { $ne: null } }).success).toBe(false);
    expect(checkoutSchema.safeParse({ items: [{ variantId: { $gt: '' }, quantity: 1 }] }).success).toBe(false);
  });
  it('validates coupons and passwords', () => {
    expect(couponInputSchema.safeParse({ code: 'save10', type: 'percentage', value: 150 }).success).toBe(false);
    expect(couponInputSchema.safeParse({ code: 'save10', type: 'percentage', value: 10 }).success).toBe(true);
    expect(registerSchema.safeParse({ name: 'Ab', email: 'a@b.co', password: 'short1' }).success).toBe(false);
    expect(registerSchema.safeParse({ name: 'Ab', email: 'A@B.CO', password: 'longenough1' }).success).toBe(true);
  });
});

describe('helpers', () => {
  it('sanitizes markup and control characters', () => {
    expect(sanitizeText('<script>alert(1)</script>Hello\u0000')).toBe('alert(1)Hello');
  });
  it('rate limiter blocks after the limit', () => {
    const k = `t:${Math.random()}`;
    for (let i = 0; i < 3; i++) rateLimit(k, 3, 1000);
    expect(() => rateLimit(k, 3, 1000)).toThrow();
  });
  it('only allows same-site relative redirects', () => {
    for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', 'javascript:alert(1)']) { expect(safeNext(bad, '/x')).toBe('/x'); expect(safeRedirectPath(bad, '/x')).toBe('/x'); }
    expect(safeNext('/account/orders')).toBe('/account/orders');
  });
  it('money helpers use integer paise', () => {
    expect(rupeesToPaise(19.99)).toBe(1999);
    expect(percentOf(12_345, 18)).toBe(2222);
    expect(formatPaise(null)).toBe('—');
    expect(formatPaise(150_000)).toContain('1,500');
  });
  it('slug and sku generation', () => {
    expect(slugify('Glyceryl Stearate (and) PEG-100 Stearate')).toBe('glyceryl-stearate-and-peg-100-stearate');
    expect(generateSku('Niacinamide', '1 kg', 2)).toBe('VC-NIACI-1KG-002');
    expect(sha256('a')).toHaveLength(64);
  });
  it('date ranges use IST business days', () => {
    const now = new Date('2026-06-10T20:00:00Z'); // 01:30 IST on the 11th
    const today = resolveRange('today', undefined, undefined, now);
    expect(today.from.toISOString()).toBe('2026-06-10T18:30:00.000Z');
    expect(resolveRange('7d', undefined, undefined, now).from.toISOString()).toBe('2026-06-04T18:30:00.000Z');
  });
});
