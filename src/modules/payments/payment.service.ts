import { getEnv } from '@/config/env';
import { getRepos } from '@/database/repositories';
import type { Repositories } from '@/database/repositories/interfaces';
import { AppError, Errors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { createRazorpayRefund, fetchRazorpayPayment, verifyCheckoutSignature } from '@/services/razorpay';
import { sendEmail, templates } from '@/services/email';
import { formatPaise } from '@/utils/money';
import { audit } from '../audit/audit.service';
import { revalidateCatalog } from '@/lib/cache';
import type { Order } from '@/types/domain';

type Outcome = 'confirmed' | 'already_confirmed' | 'not_found' | 'amount_mismatch' | 'not_captured';

/**
 * The single, idempotent place where an order becomes paid. Called from BOTH the browser verify
 * endpoint and the webhook; whichever arrives first wins an atomic status transition, the other is a no-op.
 */
export async function confirmPayment(input: {
  providerOrderId: string;
  providerPaymentId: string;
  amountPaise: number;
  currency: string;
  method?: string;
  source: 'verify' | 'webhook';
}): Promise<{ outcome: Outcome; orderId?: string }> {
  const repos = await getRepos();
  const payment = await repos.payments.findByProviderOrderId(input.providerOrderId);
  if (!payment) return { outcome: 'not_found' };

  if (input.amountPaise !== payment.amountPaise || input.currency !== payment.currency) {
    await repos.payments.update(payment.id, { status: 'failed', failureReason: 'amount_or_currency_mismatch' });
    await audit({ action: 'payment.mismatch', resourceType: 'payment', resourceId: payment.id, meta: { expected: payment.amountPaise, got: input.amountPaise, currency: input.currency } });
    logger.error('Payment amount mismatch', { paymentId: payment.id });
    return { outcome: 'amount_mismatch', orderId: payment.orderId };
  }

  const order = await repos.orders.findById(payment.orderId);
  if (!order) return { outcome: 'not_found' };

  await repos.payments.update(payment.id, {
    status: payment.status === 'refunded' || payment.status === 'partially_refunded' ? payment.status : 'captured',
    providerPaymentId: input.providerPaymentId, method: input.method, signatureVerified: true, verifiedAt: new Date(), failureReason: undefined,
  });

  // Atomic gate: only one caller moves the order out of the unpaid state.
  const wasSystemExpired = order.status === 'cancelled' && order.statusHistory.at(-1)?.note === 'Payment window expired';
  const from: Order['status'][] = wasSystemExpired ? ['payment_pending', 'pending', 'cancelled'] : ['payment_pending', 'pending'];
  const moved = await repos.orders.transitionIf(
    order.id, from, 'confirmed', { paymentStatus: 'paid', reservedUntil: null },
    wasSystemExpired ? `Payment received via ${input.source} after reservation expiry` : `Payment received (${input.source})`,
  );
  if (!moved) return { outcome: 'already_confirmed', orderId: order.id };

  await finalizeStock(repos, moved, wasSystemExpired);
  revalidateCatalog(); // stock was committed: availability shown in listings changed
  const items = await repos.orders.items(moved.id);
  await repos.products.incrementSales(items.map((i) => ({ productId: i.productId, quantity: i.quantity })));
  if (moved.couponId) await repos.coupons.recordUsage(moved.couponId, moved.userId, moved.id, moved.discountPaise);

  await audit({ userId: moved.userId, action: 'payment.captured', resourceType: 'payment', resourceId: payment.id, meta: { orderId: moved.id, source: input.source, amountPaise: payment.amountPaise } });
  const user = await repos.users.findById(moved.userId);
  void sendEmail({
    to: moved.customerEmail,
    ...templates.orderConfirmation(user?.name ?? 'there', moved.orderNumber, formatPaise(moved.totalPaise), `${getEnv().NEXT_PUBLIC_APP_URL}/orders/${moved.id}`),
  });
  await repos.notifications.create({ type: 'order', audience: 'admin', title: `New order ${moved.orderNumber}`, body: formatPaise(moved.totalPaise), data: { orderId: moved.id } });
  return { outcome: 'confirmed', orderId: moved.id };
}

/** Commits reserved stock; if the reservation had been released (late payment), re-reserve or flag for review. */
async function finalizeStock(repos: Repositories, order: Order, _late: boolean) {
  const items = await repos.orders.items(order.id);
  const variants = await repos.products.findVariantsByIds(items.map((i) => i.variantId));
  const tracked = new Set(variants.filter((v) => v.trackInventory).map((v) => v.id));
  let conflict = false;
  for (const it of items) {
    if (!tracked.has(it.variantId)) continue;
    if (await repos.inventory.commit(it.variantId, it.quantity, order.id)) continue;
    const ref = `${order.id}:late`;
    const r = await repos.inventory.reserve(it.variantId, it.quantity, ref);
    if (r === 'insufficient') { conflict = true; continue; }
    await repos.inventory.commit(it.variantId, it.quantity, ref);
  }
  if (conflict) {
    await repos.orders.updateStatus(order.id, 'confirmed', 'STOCK_CONFLICT: paid but stock insufficient - review / refund');
    await repos.notifications.create({ type: 'stock_conflict', audience: 'admin', title: `Stock conflict on ${order.orderNumber}`, body: 'Paid order could not be fully reserved. Review or refund.', data: { orderId: order.id } });
  }
}

/** Browser callback after Razorpay Checkout. NEVER trusted on its own: signature + server-side fetch of the payment. */
export async function verifyAndConfirm(userId: string, p: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
  const repos = await getRepos();
  const payment = await repos.payments.findByProviderOrderId(p.razorpay_order_id);
  if (!payment) throw Errors.notFound('Payment not found');
  const order = await repos.orders.findByIdForUser(payment.orderId, userId); // ownership check
  if (!order) throw Errors.notFound('Payment not found');

  const secret = getEnv().RAZORPAY_KEY_SECRET;
  if (!verifyCheckoutSignature(p.razorpay_order_id, p.razorpay_payment_id, p.razorpay_signature, secret)) {
    await audit({ userId, action: 'payment.signature_invalid', resourceType: 'payment', resourceId: payment.id });
    throw new AppError('Payment verification failed', 400, 'SIGNATURE_INVALID');
  }
  // Cross-check amount/currency/order directly with Razorpay (do not trust browser-supplied data).
  const remote = await fetchRazorpayPayment(p.razorpay_payment_id);
  if (remote.orderId !== p.razorpay_order_id) throw new AppError('Payment does not belong to this order', 400, 'ORDER_MISMATCH');
  if (remote.status !== 'captured') {
    // authorized (awaiting capture) or processing: webhook will finalize.
    return { status: 'processing' as const, orderId: order.id };
  }
  const r = await confirmPayment({ providerOrderId: remote.orderId, providerPaymentId: remote.id, amountPaise: remote.amount, currency: remote.currency, method: remote.method, source: 'verify' });
  if (r.outcome === 'amount_mismatch') throw new AppError('Payment amount mismatch. Our team has been notified.', 409, 'AMOUNT_MISMATCH');
  return { status: 'paid' as const, orderId: order.id };
}

/* -------------------------------- Webhooks -------------------------------- */
interface RzpEvent {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id?: string; amount: number; currency: string; method?: string; status: string; error_description?: string } };
    refund?: { entity: { id: string; payment_id: string; amount: number; status: string } };
    order?: { entity: { id: string } };
  };
}

export async function handleWebhookEvent(eventId: string, evt: RzpEvent): Promise<string> {
  const repos = await getRepos();
  const pay = evt.payload.payment?.entity;
  const fresh = await repos.payments.recordEvent({ eventId, type: evt.event, providerPaymentId: pay?.id, providerOrderId: pay?.order_id });
  if (!fresh) return 'duplicate';

  let outcome = 'ignored';
  try {
    switch (evt.event) {
      case 'payment.captured':
      case 'order.paid': {
        if (!pay?.order_id) break;
        const r = await confirmPayment({ providerOrderId: pay.order_id, providerPaymentId: pay.id, amountPaise: pay.amount, currency: pay.currency, method: pay.method, source: 'webhook' });
        outcome = r.outcome;
        break;
      }
      case 'payment.failed': {
        if (!pay?.order_id) break;
        const payment = await repos.payments.findByProviderOrderId(pay.order_id);
        if (payment && payment.status !== 'captured' && payment.status !== 'refunded' && payment.status !== 'partially_refunded') {
          await repos.payments.update(payment.id, { status: 'failed', providerPaymentId: pay.id, method: pay.method, failureReason: (pay.error_description ?? 'failed').slice(0, 200) });
          const order = await repos.orders.findById(payment.orderId);
          if (order && order.paymentStatus === 'unpaid') await repos.orders.setPaymentStatus(order.id, 'failed');
          await audit({ action: 'payment.failed', resourceType: 'payment', resourceId: payment.id });
        }
        outcome = 'failed_recorded';
        break;
      }
      case 'refund.processed':
      case 'refund.failed':
      case 'refund.created': {
        const r = evt.payload.refund?.entity;
        if (!r) break;
        const rec = await repos.payments.findRefundByProviderId(r.id);
        if (rec) await repos.payments.updateRefund(rec.id, { status: r.status === 'processed' ? 'processed' : r.status === 'failed' ? 'failed' : 'pending' });
        outcome = 'refund_synced';
        break;
      }
      default:
        outcome = 'ignored';
    }
  } catch (e) {
    // Let Razorpay retry: forget the event so the retry is not treated as a duplicate.
    logger.error('Webhook processing failed', { eventId, event: evt.event, error: String(e) });
    await repos.payments.forgetEvent(eventId);
    throw e;
  }
  await repos.payments.markEventProcessed(eventId, outcome);
  return outcome;
}

/* --------------------------------- Refunds --------------------------------- */
export async function refundOrder(orderId: string, amountPaise: number, reason: string | undefined, actor: { userId: string; ip?: string }) {
  const repos = await getRepos();
  const order = await repos.orders.findById(orderId);
  if (!order) throw Errors.notFound('Order not found');
  const payments = await repos.payments.listByOrder(orderId);
  const payment = payments.find((p) => p.status === 'captured' || p.status === 'partially_refunded');
  if (!payment?.providerPaymentId) throw Errors.unprocessable('There is no captured payment to refund');
  const refundable = payment.amountPaise - payment.refundedPaise;
  if (amountPaise > refundable) throw Errors.badRequest(`Maximum refundable amount is ${formatPaise(refundable)}`);

  const record = await repos.payments.createRefund({ paymentId: payment.id, orderId, amountPaise, status: 'pending', reason, actorId: actor.userId, providerRefundId: null });
  try {
    const r = await createRazorpayRefund(payment.providerPaymentId, amountPaise, { orderId, refundRecord: record.id });
    await repos.payments.updateRefund(record.id, { providerRefundId: r.id, status: r.status === 'processed' ? 'processed' : 'pending' });
  } catch (e) {
    await repos.payments.updateRefund(record.id, { status: 'failed' });
    logger.error('Razorpay refund failed', { orderId, error: String(e) });
    throw new AppError('The payment gateway rejected the refund', 502, 'REFUND_FAILED');
  }
  const refundedTotal = payment.refundedPaise + amountPaise;
  const full = refundedTotal >= payment.amountPaise;
  await repos.payments.update(payment.id, { refundedPaise: refundedTotal, status: full ? 'refunded' : 'partially_refunded' });
  await repos.orders.setPaymentStatus(orderId, full ? 'refunded' : 'partially_refunded');
  if (full && ['cancelled', 'returned'].includes(order.status)) await repos.orders.updateStatus(orderId, 'refunded', reason ?? 'Refund issued', actor.userId, 'refunded');
  await audit({ userId: actor.userId, ip: actor.ip, action: 'payment.refund', resourceType: 'order', resourceId: orderId, meta: { amountPaise, full, reason } });
  return { refundId: record.id, full };
}
