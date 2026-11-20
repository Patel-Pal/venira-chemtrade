import { getRepos } from '@/database/repositories';
import { AppError } from '@/lib/errors';
import { availableStock, computeCouponDiscount, computeTotals, type PricingLine, type Totals } from './pricing';
import type { Coupon, ShippingMethod } from '@/types/domain';

export type LineIssue = 'unavailable' | 'price_on_request' | 'out_of_stock' | 'insufficient_stock';

export interface CartLineDTO {
  variantId: string;
  productId: string;
  categoryId: string;
  slug: string;
  name: string;
  sku: string;
  variantLabel: string;
  imageUrl?: string;
  unitPricePaise: number | null;
  compareAtPaise?: number | null;
  quantity: number;
  lineTotalPaise: number;
  maxQuantity: number | null;
  trackInventory: boolean;
  issue?: LineIssue;
}

export interface PricedCart {
  lines: CartLineDTO[];
  totals: Totals;
  coupon?: { code: string; discountPaise: number } | null;
  couponError?: string;
  shippingMethods: Pick<ShippingMethod, 'id' | 'name' | 'description' | 'pricePaise' | 'freeAbovePaise' | 'estimatedDays'>[];
  shippingMethodId?: string;
  taxLabel?: string;
  hasIssues: boolean;
}

/** Collapses duplicate variants and clamps quantities into a sane range. */
export function normalizeItems(items: { variantId: string; quantity: number }[]) {
  const map = new Map<string, number>();
  for (const i of items) map.set(i.variantId, Math.min(10_000, (map.get(i.variantId) ?? 0) + i.quantity));
  return [...map].map(([variantId, quantity]) => ({ variantId, quantity }));
}

export async function resolveLines(items: { variantId: string; quantity: number }[]): Promise<CartLineDTO[]> {
  const repos = await getRepos();
  const norm = normalizeItems(items);
  const variants = await repos.products.findVariantsByIds(norm.map((i) => i.variantId));
  const products = await repos.products.findByIds([...new Set(variants.map((v) => v.productId))]);
  const [images, inv] = await Promise.all([
    repos.products.listImages(products.map((p) => p.id)),
    repos.inventory.getByVariantIds(variants.filter((v) => v.trackInventory).map((v) => v.id)),
  ]);
  const vMap = new Map(variants.map((v) => [v.id, v]));
  const pMap = new Map(products.map((p) => [p.id, p]));
  const iMap = new Map(inv.map((i) => [i.variantId, i]));

  return norm.flatMap((item): CartLineDTO[] => {
    const v = vMap.get(item.variantId);
    const p = v ? pMap.get(v.productId) : undefined;
    if (!v || !p) return [];
    const base = {
      variantId: v.id, productId: p.id, categoryId: p.categoryId, slug: p.slug, name: p.name, sku: v.sku, variantLabel: v.label,
      imageUrl: images.find((im) => im.productId === p.id)?.url, compareAtPaise: v.compareAtPricePaise ?? null,
      quantity: item.quantity, trackInventory: v.trackInventory,
    };
    if (p.status !== 'published' || !v.isActive) return [{ ...base, unitPricePaise: null, lineTotalPaise: 0, maxQuantity: 0, issue: 'unavailable' }];
    if (v.pricePaise === null) return [{ ...base, unitPricePaise: null, lineTotalPaise: 0, maxQuantity: null, issue: 'price_on_request' }];
    let max: number | null = null;
    let issue: LineIssue | undefined;
    if (v.trackInventory) {
      const i = iMap.get(v.id);
      max = i ? availableStock(i.quantityOnHand, i.quantityReserved) : 0;
      if (max <= 0) issue = 'out_of_stock';
      else if (item.quantity > max) issue = 'insufficient_stock';
    }
    return [{ ...base, unitPricePaise: v.pricePaise, lineTotalPaise: v.pricePaise * item.quantity, maxQuantity: max, issue }];
  });
}

export const toPricingLines = (lines: CartLineDTO[]): PricingLine[] =>
  lines.filter((l) => l.unitPricePaise !== null && !l.issue).map((l) => ({ productId: l.productId, categoryId: l.categoryId, quantity: l.quantity, unitPricePaise: l.unitPricePaise as number }));

export async function validateCoupon(code: string, lines: PricingLine[], userId?: string): Promise<{ coupon: Coupon; discountPaise: number }> {
  const repos = await getRepos();
  const coupon = await repos.coupons.findByCode(code);
  if (!coupon) throw new AppError('Coupon code is not valid', 422, 'COUPON_INVALID');
  const uses = userId ? await repos.orders.countByUserForCoupon(userId, coupon.id) : 0;
  const discountPaise = computeCouponDiscount(
    { ...coupon, productIds: coupon.productIds, categoryIds: coupon.categoryIds }, lines, new Date(), uses,
  );
  return { coupon, discountPaise };
}

/** Authoritative cart pricing. Used for the cart page and again (re-run) during checkout. */
export async function priceCart(input: { items: { variantId: string; quantity: number }[]; couponCode?: string; shippingMethodId?: string; userId?: string }): Promise<PricedCart> {
  const repos = await getRepos();
  const lines = await resolveLines(input.items);
  const pricing = toPricingLines(lines);

  let coupon: PricedCart['coupon'] = null;
  let couponError: string | undefined;
  let discountPaise = 0;
  if (input.couponCode && pricing.length) {
    try {
      const r = await validateCoupon(input.couponCode, pricing, input.userId);
      discountPaise = r.discountPaise;
      coupon = { code: r.coupon.code, discountPaise };
    } catch (e) {
      couponError = e instanceof AppError ? e.message : 'Coupon could not be applied';
    }
  }

  const methods = await repos.shipping.list({ activeOnly: true });
  const chosen = methods.find((m) => m.id === input.shippingMethodId) ?? methods[0];
  const taxRules = (await repos.shipping.listTax()).filter((t) => t.isActive);
  const totals = computeTotals({ lines: pricing, discountPaise, shipping: chosen && pricing.length ? chosen : null, taxRules });

  return {
    lines, totals, coupon, couponError,
    shippingMethods: methods.map((m) => ({ id: m.id, name: m.name, description: m.description, pricePaise: m.pricePaise, freeAbovePaise: m.freeAbovePaise, estimatedDays: m.estimatedDays })),
    shippingMethodId: chosen?.id,
    taxLabel: taxRules.length ? taxRules.map((t) => `${t.name} ${t.ratePercent}%`).join(' + ') : undefined,
    hasIssues: lines.some((l) => l.issue),
  };
}
