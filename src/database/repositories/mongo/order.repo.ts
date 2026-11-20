/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomBytes } from 'crypto';
import { CouponUsageModel, OrderItemModel, OrderModel } from '../../models';
import type { ID, Order, OrderItem, OrderStatus } from '@/types/domain';
import type { IOrderRepository, OrderListQuery } from '../interfaces';
import { escapeRegex, isDuplicateKey, isId, mapDoc, oid, paged, skip } from './helpers';

const PAID = ['paid', 'partially_refunded'];
const TZ = 'Asia/Kolkata';

function dateRange(from?: Date, to?: Date) {
  if (!from && !to) return {};
  return { createdAt: { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) } };
}

export class MongoOrderRepository implements IOrderRepository {
  async create(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>, items: Omit<OrderItem, 'id' | 'orderId'>[]) {
    let doc;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        doc = await OrderModel.create({
          ...order,
          userId: oid(order.userId),
          couponId: order.couponId ? oid(order.couponId) : null,
          shippingMethod: { ...order.shippingMethod, id: oid(order.shippingMethod.id) },
          statusHistory: order.statusHistory.map((h) => ({ ...h, actorId: h.actorId && isId(h.actorId) ? oid(h.actorId) : undefined })),
          orderNumber: attempt === 0 ? order.orderNumber : await this.nextOrderNumber(),
        });
        break;
      } catch (e) {
        if (isDuplicateKey(e) && String((e as any).message).includes('orderNumber')) continue;
        throw e;
      }
    }
    if (!doc) throw new Error('Could not allocate order number');
    await OrderItemModel.insertMany(
      items.map((i) => ({ ...i, orderId: doc._id, productId: oid(i.productId), variantId: oid(i.variantId) })),
    );
    return mapDoc<Order>(doc.toObject());
  }

  async findById(id: ID) {
    if (!isId(id)) return null;
    const d = await OrderModel.findById(id).lean();
    return d ? mapDoc<Order>(d) : null;
  }
  async findByIdForUser(id: ID, userId: ID) {
    if (!isId(id)) return null;
    const d = await OrderModel.findOne({ _id: id, userId: oid(userId) }).lean();
    return d ? mapDoc<Order>(d) : null;
  }
  async findByIdempotencyKey(userId: ID, key: string) {
    const d = await OrderModel.findOne({ userId: oid(userId), idempotencyKey: key }).lean();
    return d ? mapDoc<Order>(d) : null;
  }
  async items(orderId: ID) {
    return (await OrderItemModel.find({ orderId: oid(orderId) }).lean()).map((d) => mapDoc<OrderItem>(d));
  }

  async list(q: OrderListQuery) {
    const f: Record<string, any> = { ...dateRange(q.from, q.to) };
    if (q.status) f.status = q.status;
    if (q.paymentStatus) f.paymentStatus = q.paymentStatus;
    if (q.userId) f.userId = oid(q.userId);
    if (q.search) {
      const rx = new RegExp(escapeRegex(q.search), 'i');
      f.$or = [{ orderNumber: rx }, { customerEmail: rx }, { customerPhone: rx }, { 'shippingAddress.fullName': rx }];
    }
    const [items, total] = await Promise.all([
      OrderModel.find(f).sort({ createdAt: -1 }).skip(skip(q)).limit(q.limit).lean(),
      OrderModel.countDocuments(f),
    ]);
    return paged(items.map((d) => mapDoc<Order>(d)), total, q);
  }

  async updateStatus(id: ID, status: OrderStatus, note?: string, actorId?: ID, paymentStatus?: Order['paymentStatus']) {
    if (!isId(id)) return null;
    const entry: any = { status, at: new Date(), ...(note ? { note } : {}), ...(actorId && isId(actorId) ? { actorId: oid(actorId) } : {}) };
    const d = await OrderModel.findByIdAndUpdate(
      id,
      { $set: { status, ...(paymentStatus ? { paymentStatus } : {}) }, $push: { statusHistory: entry } },
      { new: true },
    ).lean();
    return d ? mapDoc<Order>(d) : null;
  }

  async transitionIf(id: ID, fromStatuses: OrderStatus[], status: OrderStatus, patch: Partial<Order>, note?: string) {
    if (!isId(id)) return null;
    const { statusHistory: _h, id: _i, createdAt: _c, updatedAt: _u, ...safe } = patch as any;
    const d = await OrderModel.findOneAndUpdate(
      { _id: id, status: { $in: fromStatuses } },
      { $set: { ...safe, status }, $push: { statusHistory: { status, at: new Date(), ...(note ? { note } : {}) } } },
      { new: true },
    ).lean();
    return d ? mapDoc<Order>(d) : null;
  }

  async setTracking(id: ID, tracking: NonNullable<Order['tracking']>) {
    if (!isId(id)) return null;
    const d = await OrderModel.findByIdAndUpdate(id, { $set: { tracking } }, { new: true }).lean();
    return d ? mapDoc<Order>(d) : null;
  }
  async setPaymentStatus(id: ID, paymentStatus: Order['paymentStatus']) {
    await OrderModel.updateOne({ _id: id }, { $set: { paymentStatus } });
  }

  async findExpiredReservations(now: Date, limit: number) {
    const ds = await OrderModel.find({ status: 'payment_pending', reservedUntil: { $lte: now } }).limit(limit).lean();
    return ds.map((d) => mapDoc<Order>(d));
  }

  async nextOrderNumber() {
    const d = new Date();
    const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
    return `VC-${ymd}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  async countByUserForCoupon(userId: ID, couponId: ID) {
    return CouponUsageModel.countDocuments({ userId: oid(userId), couponId: oid(couponId) });
  }

  async hasUserPurchased(userId: ID, productId: ID) {
    const orders = await OrderModel.find({ userId: oid(userId), paymentStatus: { $in: PAID } }).select('_id').lean();
    if (!orders.length) return false;
    return Boolean(await OrderItemModel.exists({ orderId: { $in: orders.map((o) => o._id) }, productId: oid(productId) }));
  }

  async hasOrderItemsForProduct(productId: ID) {
    return Boolean(await OrderItemModel.exists({ productId: oid(productId) }));
  }

  async summary(from?: Date, to?: Date) {
    const range = dateRange(from, to);
    const [paid] = await OrderModel.aggregate([
      { $match: { ...range, paymentStatus: { $in: PAID } } },
      { $group: { _id: null, revenue: { $sum: '$totalPaise' }, count: { $sum: 1 } } },
    ]);
    const [orders, pending] = await Promise.all([
      OrderModel.countDocuments(range),
      OrderModel.countDocuments({ ...range, status: { $in: ['pending', 'payment_pending', 'confirmed', 'processing'] } }),
    ]);
    const revenuePaise = paid?.revenue ?? 0;
    const paidOrders = paid?.count ?? 0;
    return { revenuePaise, orders, paidOrders, pendingOrders: pending, avgOrderPaise: paidOrders ? Math.round(revenuePaise / paidOrders) : 0 };
  }

  async revenueSeries(from: Date, to: Date) {
    const rows = await OrderModel.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to }, paymentStatus: { $in: PAID } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }, revenue: { $sum: '$totalPaise' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return rows.map((r) => ({ date: r._id as string, revenuePaise: r.revenue as number, orders: r.orders as number }));
  }

  async statusBreakdown(from?: Date, to?: Date) {
    const rows = await OrderModel.aggregate([{ $match: dateRange(from, to) }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    return rows.map((r) => ({ status: r._id as string, count: r.count as number }));
  }

  async topProducts(from: Date | undefined, to: Date | undefined, limit: number) {
    const rows = await OrderItemModel.aggregate([
      { $lookup: { from: 'orders', localField: 'orderId', foreignField: '_id', as: 'o' } },
      { $unwind: '$o' },
      { $match: { 'o.paymentStatus': { $in: PAID }, ...(from || to ? { 'o.createdAt': { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) } } : {}) } },
      { $group: { _id: '$productId', name: { $first: '$productName' }, quantity: { $sum: '$quantity' }, revenue: { $sum: '$lineTotalPaise' } } },
      { $sort: { revenue: -1 } },
      { $limit: limit },
    ]);
    return rows.map((r) => ({ productId: String(r._id), name: r.name as string, quantity: r.quantity as number, revenuePaise: r.revenue as number }));
  }

  async customerStats(userId: ID) {
    const [r] = await OrderModel.aggregate([
      { $match: { userId: oid(userId), paymentStatus: { $in: PAID } } },
      { $group: { _id: null, spent: { $sum: '$totalPaise' }, orders: { $sum: 1 } } },
    ]);
    return { orders: r?.orders ?? 0, spentPaise: r?.spent ?? 0 };
  }
}
