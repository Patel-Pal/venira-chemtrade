import { describe, expect, it } from 'vitest';
import { availableStock, computeCouponDiscount, computeShipping, computeTax, computeTotals, type CouponRule, type PricingLine } from '@/modules/orders/pricing';
import { AppError } from '@/lib/errors';

const lines: PricingLine[] = [
  { productId: 'p1', categoryId: 'c1', quantity: 2, unitPricePaise: 50_000 }, // ₹1000
  { productId: 'p2', categoryId: 'c2', quantity: 1, unitPricePaise: 25_050 }, // ₹250.50
];
const now = new Date('2026-06-01T00:00:00Z');
const base: CouponRule = { type: 'percentage', value: 10, minOrderPaise: 0, usedCount: 0, productIds: [], categoryIds: [], isActive: true };

describe('totals', () => {
  it('computes subtotal, shipping, tax and total in integer paise', () => {
    const t = computeTotals({ lines, discountPaise: 0, shipping: { pricePaise: 5_000 }, taxRules: [{ ratePercent: 18, appliesToShipping: false }] });
    expect(t.subtotalPaise).toBe(125_050);
    expect(t.shippingPaise).toBe(5_000);
    expect(t.taxPaise).toBe(22_509); // round(125050 * 0.18)
    expect(t.totalPaise).toBe(125_050 + 5_000 + 22_509);
    expect(Number.isInteger(t.totalPaise)).toBe(true);
  });
  it('applies tax to shipping only when configured', () => {
    expect(computeTax(100_000, 10_000, [{ ratePercent: 10, appliesToShipping: true }])).toBe(11_000);
    expect(computeTax(100_000, 10_000, [{ ratePercent: 10, appliesToShipping: false }])).toBe(10_000);
  });
  it('gives free shipping above the threshold (after discount)', () => {
    expect(computeShipping(99_999, { pricePaise: 5_000, freeAbovePaise: 100_000 })).toBe(5_000);
    expect(computeShipping(100_000, { pricePaise: 5_000, freeAbovePaise: 100_000 })).toBe(0);
  });
  it('never lets the discount exceed the subtotal', () => {
    const t = computeTotals({ lines, discountPaise: 9_999_999, shipping: null, taxRules: [] });
    expect(t.discountPaise).toBe(t.subtotalPaise);
    expect(t.totalPaise).toBe(0);
  });
});

describe('coupons', () => {
  it('percentage discount rounds to nearest paisa and honours max discount', () => {
    expect(computeCouponDiscount(base, lines, now, 0)).toBe(12_505);
    expect(computeCouponDiscount({ ...base, maxDiscountPaise: 5_000 }, lines, now, 0)).toBe(5_000);
  });
  it('fixed discount is capped at the eligible subtotal', () => {
    expect(computeCouponDiscount({ ...base, type: 'fixed', value: 10_000_000 }, lines, now, 0)).toBe(125_050);
  });
  it('rejects inactive, not-started, expired, exhausted and over-used coupons', () => {
    const code = (c: Partial<CouponRule>, uses = 0) => { try { computeCouponDiscount({ ...base, ...c }, lines, now, uses); return 'ok'; } catch (e) { return (e as AppError).code; } };
    expect(code({ isActive: false })).toBe('COUPON_INACTIVE');
    expect(code({ startsAt: new Date('2026-07-01') })).toBe('COUPON_NOT_STARTED');
    expect(code({ expiresAt: new Date('2026-05-01') })).toBe('COUPON_EXPIRED');
    expect(code({ usageLimit: 5, usedCount: 5 })).toBe('COUPON_EXHAUSTED');
    expect(code({ perCustomerLimit: 1 }, 1)).toBe('COUPON_CUSTOMER_LIMIT');
    expect(code({ minOrderPaise: 200_000 })).toBe('COUPON_MIN_ORDER');
  });
  it('applies only to eligible products/categories', () => {
    expect(computeCouponDiscount({ ...base, productIds: ['p2'] }, lines, now, 0)).toBe(2_505); // 10% of 25050
    expect(computeCouponDiscount({ ...base, categoryIds: ['c1'] }, lines, now, 0)).toBe(10_000);
    expect(() => computeCouponDiscount({ ...base, productIds: ['nope'] }, lines, now, 0)).toThrow(AppError);
  });
});

describe('stock', () => {
  it('available stock never goes negative', () => {
    expect(availableStock(10, 3)).toBe(7);
    expect(availableStock(2, 5)).toBe(0);
  });
});
