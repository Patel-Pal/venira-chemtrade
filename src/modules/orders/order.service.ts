import { getRepos } from '@/database/repositories';
import { AppError, Errors } from '@/lib/errors';
import { audit } from '../audit/audit.service';
import type { Order, OrderStatus } from '@/types/domain';

/** Manual transitions an admin may perform. `confirmed` from unpaid states and `refunded` are system/payment driven only. */
export const ADMIN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['cancelled'],
  payment_pending: ['cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery', 'delivered', 'returned'],
  out_for_delivery: ['delivered', 'returned'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
  refunded: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ADMIN_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function getOrderDetail(orderId: string, userId?: string) {
  const repos = await getRepos();
  const order = userId ? await repos.orders.findByIdForUser(orderId, userId) : await repos.orders.findById(orderId);
  if (!order) return null;
  const [items, payments] = await Promise.all([repos.orders.items(order.id), repos.payments.listByOrder(order.id)]);
  return { order, items, payments };
}

async function restockOrder(order: Order, reason: string, suffix: string) {
  const repos = await getRepos();
  const items = await repos.orders.items(order.id);
  const variants = await repos.products.findVariantsByIds(items.map((i) => i.variantId));
  const tracked = new Set(variants.filter((v) => v.trackInventory).map((v) => v.id));
  for (const it of items) {
    if (!tracked.has(it.variantId)) continue;
    if (order.paymentStatus === 'unpaid' || order.paymentStatus === 'failed') {
      await repos.inventory.release(it.variantId, it.quantity, order.id);
    } else {
      await repos.inventory.restock(it.variantId, it.quantity, `${order.id}:${suffix}`, reason);
    }
  }
}

export async function updateOrderStatus(orderId: string, to: OrderStatus, note: string | undefined, actor: { userId: string; ip?: string }) {
  const repos = await getRepos();
  const order = await repos.orders.findById(orderId);
  if (!order) throw Errors.notFound('Order not found');
  if (!canTransition(order.status, to)) throw new AppError(`Cannot change an order from "${order.status}" to "${to}"`, 422, 'INVALID_TRANSITION');
  if (to !== 'cancelled' && order.paymentStatus !== 'paid' && order.paymentStatus !== 'partially_refunded') {
    throw new AppError('Order has no verified payment', 422, 'NOT_PAID'); // admins cannot bypass payment verification
  }
  const updated = await repos.orders.transitionIf(orderId, [order.status], to, to === 'cancelled' ? { reservedUntil: null } : {}, note);
  if (!updated) throw Errors.conflict('Order was modified by someone else. Refresh and retry.');
  if (to === 'cancelled') await restockOrder(order, note ?? 'Order cancelled', 'cancel');
  if (to === 'returned') await restockOrder(order, note ?? 'Order returned', 'return');
  await audit({
    userId: actor.userId, ip: actor.ip, action: `order.status.${to}`, resourceType: 'order', resourceId: orderId,
    before: { status: order.status }, after: { status: to }, meta: { note },
  });
  return updated;
}

export async function setTracking(orderId: string, tracking: { carrier?: string; trackingNumber?: string; url?: string }, actor: { userId: string; ip?: string }) {
  const repos = await getRepos();
  const o = await repos.orders.setTracking(orderId, tracking);
  if (!o) throw Errors.notFound('Order not found');
  await audit({ userId: actor.userId, ip: actor.ip, action: 'order.tracking', resourceType: 'order', resourceId: orderId, after: tracking });
  return o;
}

/** Customer self-service cancel: only before the order is processed. Refund is then issued by staff. */
export async function customerCancel(orderId: string, userId: string) {
  const repos = await getRepos();
  const order = await repos.orders.findByIdForUser(orderId, userId);
  if (!order) throw Errors.notFound('Order not found');
  if (!['payment_pending', 'confirmed'].includes(order.status)) throw new AppError('This order can no longer be cancelled online. Please contact support.', 422, 'NOT_CANCELLABLE');
  return updateOrderStatus(orderId, 'cancelled', 'Cancelled by customer', { userId });
}
