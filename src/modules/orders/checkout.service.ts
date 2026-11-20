import { getEnv } from '@/config/env';
import { getRepos } from '@/database/repositories';
import { AppError, Errors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { createRazorpayOrder } from '@/services/razorpay';
import { audit } from '../audit/audit.service';
import { priceCart } from './cart.service';
import type { Address, AddressSnapshot, Order } from '@/types/domain';

function snapshot(a: Address): AddressSnapshot {
  const { id: _i, userId: _u, isDefaultShipping: _s, isDefaultBilling: _b, ...rest } = a;
  return rest;
}

export interface CheckoutResult {
  orderId: string;
  orderNumber: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
  customer: { name: string; email: string; phone?: string };
  reservedUntil: string | null;
}

async function releaseOrderStock(order: Order) {
  const repos = await getRepos();
  const items = await repos.orders.items(order.id);
  for (const it of items) {
    const v = (await repos.products.findVariantsByIds([it.variantId]))[0];
    if (v?.trackInventory) await repos.inventory.release(it.variantId, it.quantity, order.id);
  }
}

/**
 * Steps (server-authoritative): validate -> price -> create pending order -> reserve stock -> create Razorpay order.
 * Any failure after order creation rolls back reservations and cancels the pending order.
 */
export async function createCheckout(input: {
  userId: string;
  items: { variantId: string; quantity: number }[];
  shippingAddressId: string;
  billingAddressId?: string;
  shippingMethodId: string;
  couponCode?: string;
  notes?: string;
  idempotencyKey: string;
  ip?: string;
}): Promise<CheckoutResult> {
  const repos = await getRepos();
  const env = getEnv();
  const user = await repos.users.findById(input.userId);
  if (!user || user.status !== 'active') throw Errors.forbidden('Your account cannot place orders');
  if (!user.emailVerified) throw new AppError('Please verify your email address before placing an order', 403, 'EMAIL_NOT_VERIFIED');
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) throw new AppError('Online payments are not configured yet', 503, 'PAYMENTS_UNAVAILABLE');

  // Duplicate submission protection.
  const prior = await repos.orders.findByIdempotencyKey(input.userId, input.idempotencyKey);
  if (prior) return resumePayment(input.userId, prior.id);

  const priced = await priceCart({ items: input.items, couponCode: input.couponCode, shippingMethodId: input.shippingMethodId, userId: input.userId });
  if (!priced.lines.length) throw Errors.unprocessable('Your cart is empty');
  const bad = priced.lines.filter((l) => l.issue);
  if (bad.length) throw new AppError('Some items in your cart are unavailable. Please review your cart.', 409, 'CART_INVALID', bad.map((b) => ({ variantId: b.variantId, name: b.name, issue: b.issue, maxQuantity: b.maxQuantity })));
  if (input.couponCode && !priced.coupon) throw new AppError(priced.couponError ?? 'Coupon could not be applied', 422, 'COUPON_INVALID');
  const method = (await repos.shipping.findById(input.shippingMethodId));
  if (!method || !method.isActive) throw Errors.badRequest('Please choose a valid shipping method');
  if (priced.totals.totalPaise < 100) throw Errors.unprocessable('Order total is too low to process');

  const shipping = await repos.addresses.findByIdForUser(input.shippingAddressId, input.userId);
  const billing = input.billingAddressId ? await repos.addresses.findByIdForUser(input.billingAddressId, input.userId) : shipping;
  if (!shipping || !billing) throw Errors.badRequest('Please choose a valid address');

  const coupon = priced.coupon ? await repos.coupons.findByCode(priced.coupon.code) : null;
  const reservedUntil = new Date(Date.now() + env.CHECKOUT_RESERVATION_MINUTES * 60 * 1000);
  const t = priced.totals;

  const order = await repos.orders.create(
    {
      orderNumber: await repos.orders.nextOrderNumber(), userId: user.id, customerEmail: user.email, customerPhone: user.phone,
      status: 'payment_pending', paymentStatus: 'unpaid', currency: 'INR',
      subtotalPaise: t.subtotalPaise, discountPaise: t.discountPaise, shippingPaise: t.shippingPaise, taxPaise: t.taxPaise, totalPaise: t.totalPaise,
      couponId: coupon?.id ?? null, couponCode: coupon?.code ?? null,
      shippingAddress: snapshot(shipping), billingAddress: snapshot(billing),
      shippingMethod: { id: method.id, name: method.name, pricePaise: t.shippingPaise },
      statusHistory: [{ status: 'payment_pending', at: new Date(), note: 'Order created' }],
      reservedUntil, idempotencyKey: input.idempotencyKey, notes: input.notes,
    },
    priced.lines.map((l) => ({
      productId: l.productId, variantId: l.variantId, productName: l.name, sku: l.sku, variantLabel: l.variantLabel, imageUrl: l.imageUrl,
      unitPricePaise: l.unitPricePaise as number, quantity: l.quantity, lineTotalPaise: l.lineTotalPaise,
    })),
  );

  // Reserve stock for tracked variants; roll everything back on any shortage.
  const reserved: { variantId: string; quantity: number }[] = [];
  for (const l of priced.lines) {
    if (!l.trackInventory) continue;
    const r = await repos.inventory.reserve(l.variantId, l.quantity, order.id);
    if (r === 'insufficient') {
      for (const x of reserved) await repos.inventory.release(x.variantId, x.quantity, order.id);
      await repos.orders.updateStatus(order.id, 'cancelled', 'Stock unavailable at checkout');
      throw new AppError(`"${l.name}" no longer has enough stock`, 409, 'INSUFFICIENT_STOCK');
    }
    reserved.push({ variantId: l.variantId, quantity: l.quantity });
  }

  try {
    const rz = await createRazorpayOrder(order.totalPaise, order.orderNumber, { orderId: order.id, orderNumber: order.orderNumber });
    if (rz.amount !== order.totalPaise) throw new Error('Razorpay amount mismatch');
    await repos.payments.create({
      orderId: order.id, provider: 'razorpay', providerOrderId: rz.id, providerPaymentId: null, status: 'created',
      amountPaise: order.totalPaise, currency: 'INR', signatureVerified: false, refundedPaise: 0,
    });
    await audit({ userId: user.id, ip: input.ip, action: 'order.create', resourceType: 'order', resourceId: order.id, after: { total: order.totalPaise } });
    return {
      orderId: order.id, orderNumber: order.orderNumber, razorpayOrderId: rz.id, amountPaise: order.totalPaise, currency: 'INR',
      keyId: env.RAZORPAY_KEY_ID, customer: { name: user.name, email: user.email, phone: user.phone }, reservedUntil: reservedUntil.toISOString(),
    };
  } catch (e) {
    logger.error('Razorpay order creation failed; rolling back', { orderId: order.id, error: String(e) });
    await releaseOrderStock(order);
    await repos.orders.updateStatus(order.id, 'cancelled', 'Payment gateway error');
    throw new AppError('We could not start the payment. Please try again.', 502, 'PAYMENT_START_FAILED');
  }
}

/** Returns payment details for an unpaid order the customer wants to (re)try. */
export async function resumePayment(userId: string, orderId: string): Promise<CheckoutResult> {
  const repos = await getRepos();
  const env = getEnv();
  const order = await repos.orders.findByIdForUser(orderId, userId);
  if (!order) throw Errors.notFound('Order not found');
  if (order.status !== 'payment_pending') throw new AppError('This order is no longer awaiting payment', 409, 'ORDER_NOT_PAYABLE');
  if (order.reservedUntil && order.reservedUntil < new Date()) throw new AppError('The payment window for this order has expired', 409, 'ORDER_EXPIRED');
  const payments = await repos.payments.listByOrder(order.id);
  const p = payments.find((x) => x.status !== 'captured');
  if (!p) throw new AppError('This order is already paid', 409, 'ORDER_PAID');
  const user = await repos.users.findById(userId);
  return {
    orderId: order.id, orderNumber: order.orderNumber, razorpayOrderId: p.providerOrderId, amountPaise: order.totalPaise, currency: 'INR',
    keyId: env.RAZORPAY_KEY_ID, customer: { name: user?.name ?? '', email: order.customerEmail, phone: order.customerPhone }, reservedUntil: order.reservedUntil?.toISOString() ?? null,
  };
}

/** Cancels unpaid orders whose reservation window has passed and frees their stock. Safe to run repeatedly. */
export async function releaseExpiredReservations(limit = 50): Promise<number> {
  const repos = await getRepos();
  const expired = await repos.orders.findExpiredReservations(new Date(), limit);
  let n = 0;
  for (const o of expired) {
    const moved = await repos.orders.transitionIf(o.id, ['payment_pending'], 'cancelled', { reservedUntil: null }, 'Payment window expired');
    if (!moved) continue; // paid concurrently
    await releaseOrderStock(o);
    n++;
  }
  if (n) logger.info('Released expired reservations', { count: n });
  return n;
}
