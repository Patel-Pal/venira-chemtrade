/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Model } from 'mongoose';
import {
  AuditModel, BannerModel, CartItemModel, CartModel, CouponModel, CouponUsageModel, NewsletterModel, NotificationModel,
  PageModel, PaymentEventModel, PaymentModel, RefundModel, ReviewModel, SettingModel, ShippingMethodModel, TaxModel,
  WishlistItemModel, WishlistModel,
} from '../../models';
import type { Coupon, ID, Payment, PaymentRefund, Review, ShippingMethod, TaxConfiguration } from '@/types/domain';
import type {
  AuditRecord, IAuditRepository, ICouponRepository, ICrudRepository, IPaymentRepository, IReviewRepository, ISettingsRepository,
  IShippingRepository, IUserDataRepository, PageQuery,
} from '../interfaces';
import { cleanPatch, escapeRegex, isDuplicateKey, isId, mapDoc, oid, oids, paged, skip } from './helpers';

export class MongoPaymentRepository implements IPaymentRepository {
  async create(data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) {
    const d = await PaymentModel.create({ ...data, orderId: oid(data.orderId) });
    return mapDoc<Payment>(d.toObject());
  }
  async findById(id: ID) {
    if (!isId(id)) return null;
    const d = await PaymentModel.findById(id).lean();
    return d ? mapDoc<Payment>(d) : null;
  }
  async findByProviderOrderId(providerOrderId: string) {
    const d = await PaymentModel.findOne({ providerOrderId: String(providerOrderId) }).lean();
    return d ? mapDoc<Payment>(d) : null;
  }
  async findByProviderPaymentId(providerPaymentId: string) {
    const d = await PaymentModel.findOne({ providerPaymentId: String(providerPaymentId) }).lean();
    return d ? mapDoc<Payment>(d) : null;
  }
  async listByOrder(orderId: ID) {
    return (await PaymentModel.find({ orderId: oid(orderId) }).sort({ createdAt: 1 }).lean()).map((d) => mapDoc<Payment>(d));
  }
  async update(id: ID, patch: any) {
    if (!isId(id)) return null;
    const d = await PaymentModel.findByIdAndUpdate(id, { $set: cleanPatch(patch) }, { new: true }).lean();
    return d ? mapDoc<Payment>(d) : null;
  }
  async list(q: PageQuery & { status?: string; search?: string }) {
    const f: Record<string, any> = {};
    if (q.status) f.status = q.status;
    if (q.search) {
      const rx = new RegExp(escapeRegex(q.search), 'i');
      f.$or = [{ providerOrderId: rx }, { providerPaymentId: rx }];
    }
    const [items, total] = await Promise.all([
      PaymentModel.find(f).sort({ createdAt: -1 }).skip(skip(q)).limit(q.limit).lean(),
      PaymentModel.countDocuments(f),
    ]);
    return paged(items.map((d) => mapDoc<Payment>(d)), total, q);
  }
  async stats() {
    const [ok, failed, sum] = await Promise.all([
      PaymentModel.countDocuments({ status: { $in: ['captured', 'refunded', 'partially_refunded'] } }),
      PaymentModel.countDocuments({ status: 'failed' }),
      PaymentModel.aggregate([{ $match: { status: { $in: ['captured', 'partially_refunded'] } } }, { $group: { _id: null, t: { $sum: '$amountPaise' } } }]),
    ]);
    return { successful: ok, failed, capturedPaise: sum[0]?.t ?? 0 };
  }
  async recordEvent(e: { eventId: string; type: string; providerPaymentId?: string; providerOrderId?: string }) {
    try {
      await PaymentEventModel.create(e);
      return true;
    } catch (err) {
      if (isDuplicateKey(err)) return false;
      throw err;
    }
  }
  async markEventProcessed(eventId: string, outcome: string) {
    await PaymentEventModel.updateOne({ eventId }, { $set: { processedAt: new Date(), outcome } });
  }
  async forgetEvent(eventId: string) {
    await PaymentEventModel.deleteOne({ eventId });
  }
  async createRefund(data: Omit<PaymentRefund, 'id' | 'createdAt' | 'updatedAt'>) {
    const d = await RefundModel.create({
      ...data, paymentId: oid(data.paymentId), orderId: oid(data.orderId), actorId: data.actorId && isId(data.actorId) ? oid(data.actorId) : undefined,
    });
    return mapDoc<PaymentRefund>(d.toObject());
  }
  async updateRefund(id: ID, patch: any) {
    if (!isId(id)) return null;
    const d = await RefundModel.findByIdAndUpdate(id, { $set: cleanPatch(patch) }, { new: true }).lean();
    return d ? mapDoc<PaymentRefund>(d) : null;
  }
  async findRefundByProviderId(providerRefundId: string) {
    const d = await RefundModel.findOne({ providerRefundId: String(providerRefundId) }).lean();
    return d ? mapDoc<PaymentRefund>(d) : null;
  }
  async listRefunds(paymentId: ID) {
    return (await RefundModel.find({ paymentId: oid(paymentId) }).lean()).map((d) => mapDoc<PaymentRefund>(d));
  }
}

export class MongoCouponRepository implements ICouponRepository {
  async findByCode(code: string) {
    const d = await CouponModel.findOne({ code: String(code).toUpperCase().trim() }).lean();
    return d ? mapDoc<Coupon>(d) : null;
  }
  async findById(id: ID) {
    if (!isId(id)) return null;
    const d = await CouponModel.findById(id).lean();
    return d ? mapDoc<Coupon>(d) : null;
  }
  async list(q: PageQuery) {
    const [items, total] = await Promise.all([
      CouponModel.find().sort({ createdAt: -1 }).skip(skip(q)).limit(q.limit).lean(),
      CouponModel.countDocuments(),
    ]);
    return paged(items.map((d) => mapDoc<Coupon>(d)), total, q);
  }
  async create(data: any) {
    const d = await CouponModel.create({ ...data, productIds: oids(data.productIds ?? []), categoryIds: oids(data.categoryIds ?? []) });
    return mapDoc<Coupon>(d.toObject());
  }
  async update(id: ID, patch: any) {
    if (!isId(id)) return null;
    const d = await CouponModel.findByIdAndUpdate(id, { $set: cleanPatch(patch, ['productIds', 'categoryIds']) }, { new: true }).lean();
    return d ? mapDoc<Coupon>(d) : null;
  }
  async delete(id: ID) {
    if (!isId(id)) return false;
    return (await CouponModel.deleteOne({ _id: id })).deletedCount === 1;
  }
  async recordUsage(couponId: ID, userId: ID, orderId: ID, discountPaise: number) {
    try {
      await CouponUsageModel.create({ couponId: oid(couponId), userId: oid(userId), orderId: oid(orderId), discountPaise });
    } catch (e) {
      if (isDuplicateKey(e)) return false;
      throw e;
    }
    await CouponModel.updateOne({ _id: couponId }, { $inc: { usedCount: 1 } });
    return true;
  }
}

export class MongoReviewRepository implements IReviewRepository {
  async create(data: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>) {
    const d = await ReviewModel.create({ ...data, productId: oid(data.productId), userId: oid(data.userId) });
    return mapDoc<Review>(d.toObject());
  }
  async findById(id: ID) {
    if (!isId(id)) return null;
    const d = await ReviewModel.findById(id).lean();
    return d ? mapDoc<Review>(d) : null;
  }
  async list(q: PageQuery & { productId?: ID; userId?: ID; status?: Review['status'] }) {
    const f: Record<string, any> = {};
    if (q.productId && isId(q.productId)) f.productId = oid(q.productId);
    if (q.userId && isId(q.userId)) f.userId = oid(q.userId);
    if (q.status) f.status = q.status;
    const [items, total] = await Promise.all([
      ReviewModel.find(f).sort({ createdAt: -1 }).skip(skip(q)).limit(q.limit).lean(),
      ReviewModel.countDocuments(f),
    ]);
    return paged(items.map((d) => mapDoc<Review>(d)), total, q);
  }
  async setStatus(id: ID, status: Review['status']) {
    if (!isId(id)) return null;
    const d = await ReviewModel.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean();
    return d ? mapDoc<Review>(d) : null;
  }
  async delete(id: ID) {
    if (!isId(id)) return false;
    return (await ReviewModel.deleteOne({ _id: id })).deletedCount === 1;
  }
  async ratingStats(productId?: ID) {
    const match: Record<string, any> = { status: 'approved' };
    if (productId) match.productId = oid(productId);
    const [r] = await ReviewModel.aggregate([{ $match: match }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }]);
    return { average: r ? Math.round(r.avg * 10) / 10 : 0, count: r?.count ?? 0 };
  }
  async distribution() {
    const rows = await ReviewModel.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: '$rating', count: { $sum: 1 } } }]);
    return [5, 4, 3, 2, 1].map((rating) => ({ rating, count: rows.find((r) => r._id === rating)?.count ?? 0 }));
  }
}

export class MongoShippingRepository implements IShippingRepository {
  async list(opts?: { activeOnly?: boolean }) {
    const ds = await ShippingMethodModel.find(opts?.activeOnly ? { isActive: true } : {}).sort({ displayOrder: 1 }).lean();
    return ds.map((d) => mapDoc<ShippingMethod>(d));
  }
  async findById(id: ID) {
    if (!isId(id)) return null;
    const d = await ShippingMethodModel.findById(id).lean();
    return d ? mapDoc<ShippingMethod>(d) : null;
  }
  async create(data: any) {
    return mapDoc<ShippingMethod>((await ShippingMethodModel.create(data)).toObject());
  }
  async update(id: ID, patch: any) {
    if (!isId(id)) return null;
    const d = await ShippingMethodModel.findByIdAndUpdate(id, { $set: cleanPatch(patch) }, { new: true }).lean();
    return d ? mapDoc<ShippingMethod>(d) : null;
  }
  async delete(id: ID) {
    if (!isId(id)) return false;
    return (await ShippingMethodModel.deleteOne({ _id: id })).deletedCount === 1;
  }
  async listTax() {
    return (await TaxModel.find().lean()).map((d) => mapDoc<TaxConfiguration>(d));
  }
  async createTax(data: any) {
    return mapDoc<TaxConfiguration>((await TaxModel.create(data)).toObject());
  }
  async updateTax(id: ID, patch: any) {
    if (!isId(id)) return null;
    const d = await TaxModel.findByIdAndUpdate(id, { $set: cleanPatch(patch) }, { new: true }).lean();
    return d ? mapDoc<TaxConfiguration>(d) : null;
  }
  async deleteTax(id: ID) {
    if (!isId(id)) return false;
    return (await TaxModel.deleteOne({ _id: id })).deletedCount === 1;
  }
}

export class MongoSettingsRepository implements ISettingsRepository {
  async get<T = unknown>(key: string) {
    const d = await SettingModel.findOne({ key }).lean();
    return d ? (d.value as T) : null;
  }
  async getMany(keys: string[]) {
    const ds = await SettingModel.find({ key: { $in: keys } }).lean();
    return Object.fromEntries(ds.map((d) => [d.key, d.value]));
  }
  async set(key: string, value: unknown) {
    await SettingModel.updateOne({ key }, { $set: { value } }, { upsert: true });
  }
}

export class MongoAuditRepository implements IAuditRepository {
  async append(r: Omit<AuditRecord, 'id' | 'createdAt'>) {
    await AuditModel.create({ ...r, userId: r.userId && isId(r.userId) ? oid(r.userId) : undefined });
  }
  async list(q: PageQuery & { userId?: ID; action?: string; resourceType?: string }) {
    const f: Record<string, any> = {};
    if (q.userId && isId(q.userId)) f.userId = oid(q.userId);
    if (q.action) f.action = new RegExp(`^${escapeRegex(q.action)}`, 'i');
    if (q.resourceType) f.resourceType = q.resourceType;
    const [items, total] = await Promise.all([
      AuditModel.find(f).sort({ createdAt: -1 }).skip(skip(q)).limit(q.limit).lean(),
      AuditModel.countDocuments(f),
    ]);
    return paged(items.map((d) => mapDoc<AuditRecord>(d)), total, q);
  }
}

export class MongoUserDataRepository implements IUserDataRepository {
  private async cartId(userId: ID) {
    const c = await CartModel.findOneAndUpdate({ userId: oid(userId) }, { $setOnInsert: { userId: oid(userId) } }, { upsert: true, new: true }).lean();
    return c!._id;
  }
  async getCart(userId: ID) {
    const items = await CartItemModel.find({ cartId: await this.cartId(userId) }).lean();
    return items.map((i) => ({ variantId: String(i.variantId), quantity: i.quantity }));
  }
  async replaceCart(userId: ID, items: { variantId: ID; quantity: number }[]) {
    const cartId = await this.cartId(userId);
    await CartItemModel.deleteMany({ cartId });
    if (items.length) await CartItemModel.insertMany(items.filter((i) => isId(i.variantId)).map((i) => ({ cartId, variantId: oid(i.variantId), quantity: i.quantity })));
  }
  private async wishlistId(userId: ID) {
    const w = await WishlistModel.findOneAndUpdate({ userId: oid(userId) }, { $setOnInsert: { userId: oid(userId) } }, { upsert: true, new: true }).lean();
    return w!._id;
  }
  async getWishlist(userId: ID) {
    const items = await WishlistItemModel.find({ wishlistId: await this.wishlistId(userId) }).sort({ createdAt: -1 }).lean();
    return items.map((i) => String(i.productId));
  }
  async addToWishlist(userId: ID, productId: ID) {
    try {
      await WishlistItemModel.create({ wishlistId: await this.wishlistId(userId), productId: oid(productId) });
    } catch (e) {
      if (!isDuplicateKey(e)) throw e;
    }
  }
  async removeFromWishlist(userId: ID, productId: ID) {
    await WishlistItemModel.deleteOne({ wishlistId: await this.wishlistId(userId), productId: oid(productId) });
  }
  async subscribe(email: string) {
    await NewsletterModel.updateOne({ email: email.toLowerCase() }, { $set: { isActive: true } }, { upsert: true });
  }
}

/** Small generic repo for simple content collections (banners, pages, notifications). */
export class MongoCrudRepository<T extends { id: ID }> implements ICrudRepository<T> {
  constructor(
    private readonly model: Model<any>,
    private readonly sort: Record<string, 1 | -1> = { createdAt: -1 },
  ) {}
  async findById(id: ID) {
    if (!isId(id)) return null;
    const d = await this.model.findById(id).lean();
    return d ? mapDoc<T>(d) : null;
  }
  async list(q: PageQuery & { filter?: Record<string, string | boolean | number> }) {
    const f: Record<string, any> = {};
    for (const [k, v] of Object.entries(q.filter ?? {})) if (['string', 'boolean', 'number'].includes(typeof v)) f[k] = v;
    const [items, total] = await Promise.all([
      this.model.find(f).sort(this.sort).skip(skip(q)).limit(q.limit).lean(),
      this.model.countDocuments(f),
    ]);
    return paged(items.map((d: any) => mapDoc<T>(d)), total, q);
  }
  async create(data: Omit<T, 'id'>) {
    return mapDoc<T>((await this.model.create(data)).toObject());
  }
  async update(id: ID, patch: Partial<Omit<T, 'id'>>) {
    if (!isId(id)) return null;
    const d = await this.model.findByIdAndUpdate(id, { $set: cleanPatch(patch as any) }, { new: true }).lean();
    return d ? mapDoc<T>(d) : null;
  }
  async delete(id: ID) {
    if (!isId(id)) return false;
    return (await this.model.deleteOne({ _id: id })).deletedCount === 1;
  }
}

export const bannerModel = BannerModel;
export const pageModel = PageModel;
export const notificationModel = NotificationModel;
