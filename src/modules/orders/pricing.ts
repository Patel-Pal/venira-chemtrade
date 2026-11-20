/**
 * Pure pricing logic (no I/O, no DB types). All amounts are integer paise.
 * The server is the only place totals are computed; the client's numbers are display-only.
 */
import { AppError } from '@/lib/errors';
import { percentOf } from '@/utils/money';

export interface PricingLine {
  productId: string;
  categoryId: string;
  quantity: number;
  unitPricePaise: number;
}
export interface CouponRule {
  type: 'fixed' | 'percentage';
  value: number;
  minOrderPaise: number;
  maxDiscountPaise?: number | null;
  usageLimit?: number | null;
  usedCount: number;
  perCustomerLimit?: number | null;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  productIds: string[];
  categoryIds: string[];
  isActive: boolean;
}
export interface ShippingRule {
  pricePaise: number;
  freeAbovePaise?: number | null;
}
export interface TaxRule {
  ratePercent: number;
  appliesToShipping: boolean;
}
export interface Totals {
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  taxPaise: number;
  totalPaise: number;
}

export const lineTotal = (l: Pick<PricingLine, 'quantity' | 'unitPricePaise'>) => l.quantity * l.unitPricePaise;
export const sumSubtotal = (lines: PricingLine[]) => lines.reduce((s, l) => s + lineTotal(l), 0);

/** Validates a coupon and returns its discount. Throws AppError with a customer-safe message. */
export function computeCouponDiscount(coupon: CouponRule, lines: PricingLine[], now: Date, customerUses: number): number {
  if (!coupon.isActive) throw new AppError('This coupon is not active', 422, 'COUPON_INACTIVE');
  if (coupon.startsAt && now < coupon.startsAt) throw new AppError('This coupon is not valid yet', 422, 'COUPON_NOT_STARTED');
  if (coupon.expiresAt && now > coupon.expiresAt) throw new AppError('This coupon has expired', 422, 'COUPON_EXPIRED');
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) throw new AppError('This coupon has reached its usage limit', 422, 'COUPON_EXHAUSTED');
  if (coupon.perCustomerLimit != null && customerUses >= coupon.perCustomerLimit) throw new AppError('You have already used this coupon', 422, 'COUPON_CUSTOMER_LIMIT');

  const subtotal = sumSubtotal(lines);
  if (subtotal < coupon.minOrderPaise) throw new AppError('Order total is below the coupon minimum', 422, 'COUPON_MIN_ORDER');

  const restricted = coupon.productIds.length > 0 || coupon.categoryIds.length > 0;
  const eligible = restricted
    ? lines.filter((l) => coupon.productIds.includes(l.productId) || coupon.categoryIds.includes(l.categoryId))
    : lines;
  const eligibleSubtotal = sumSubtotal(eligible);
  if (eligibleSubtotal <= 0) throw new AppError('This coupon does not apply to the items in your cart', 422, 'COUPON_NOT_APPLICABLE');

  let discount = coupon.type === 'percentage' ? percentOf(eligibleSubtotal, coupon.value) : coupon.value;
  if (coupon.maxDiscountPaise != null) discount = Math.min(discount, coupon.maxDiscountPaise);
  return Math.max(0, Math.min(discount, eligibleSubtotal));
}

export function computeShipping(subtotalAfterDiscountPaise: number, rule: ShippingRule): number {
  if (rule.freeAbovePaise != null && subtotalAfterDiscountPaise >= rule.freeAbovePaise) return 0;
  return rule.pricePaise;
}

/** Taxes are added on top of prices (tax-exclusive pricing). Each configured rate is rounded independently. */
export function computeTax(taxableMerchandisePaise: number, shippingPaise: number, rules: TaxRule[]): number {
  return rules.reduce((sum, r) => {
    const base = taxableMerchandisePaise + (r.appliesToShipping ? shippingPaise : 0);
    return sum + percentOf(base, r.ratePercent);
  }, 0);
}

export function computeTotals(input: { lines: PricingLine[]; discountPaise: number; shipping: ShippingRule | null; taxRules: TaxRule[] }): Totals {
  const subtotalPaise = sumSubtotal(input.lines);
  const discountPaise = Math.min(input.discountPaise, subtotalPaise);
  const afterDiscount = subtotalPaise - discountPaise;
  const shippingPaise = input.shipping ? computeShipping(afterDiscount, input.shipping) : 0;
  const taxPaise = computeTax(afterDiscount, shippingPaise, input.taxRules);
  return { subtotalPaise, discountPaise, shippingPaise, taxPaise, totalPaise: afterDiscount + shippingPaise + taxPaise };
}

/** Stock helper: units that can still be sold. */
export const availableStock = (onHand: number, reserved: number) => Math.max(0, onHand - reserved);
