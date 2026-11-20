/* eslint-disable @typescript-eslint/no-explicit-any */
import { InventoryModel, InventoryTxModel, VariantModel } from '../../models';
import type { ID, Inventory, InventoryTransaction, InventoryTxType } from '@/types/domain';
import type { IInventoryRepository, PageQuery } from '../interfaces';
import { escapeRegex, isDuplicateKey, isId, mapDoc, oid, oids, paged, skip } from './helpers';

export class MongoInventoryRepository implements IInventoryRepository {
  async getByVariantIds(variantIds: ID[]) {
    return (await InventoryModel.find({ variantId: { $in: oids(variantIds) } }).lean()).map((d) => mapDoc<Inventory>(d));
  }

  async ensure(variantId: ID, initialQty = 0, lowStockThreshold = 10) {
    const existing = await InventoryModel.findOne({ variantId: oid(variantId) }).lean();
    if (existing) return mapDoc<Inventory>(existing);
    try {
      const d = await InventoryModel.create({ variantId: oid(variantId), quantityOnHand: initialQty, lowStockThreshold });
      await InventoryTxModel.create({ variantId: oid(variantId), type: 'initial', quantityDelta: initialQty, reason: 'Initial stock' });
      return mapDoc<Inventory>(d.toObject());
    } catch (e) {
      if (isDuplicateKey(e)) return mapDoc<Inventory>((await InventoryModel.findOne({ variantId: oid(variantId) }).lean())!);
      throw e;
    }
  }

  async setThreshold(variantId: ID, threshold: number) {
    await InventoryModel.updateOne({ variantId: oid(variantId) }, { $set: { lowStockThreshold: threshold } });
  }

  async adjust(variantId: ID, delta: number, reason: string, actorId?: ID) {
    await this.ensure(variantId);
    // Guard: resulting on-hand must not drop below reserved quantity (nor below zero).
    const d = await InventoryModel.findOneAndUpdate(
      {
        variantId: oid(variantId),
        $expr: { $gte: [{ $add: ['$quantityOnHand', delta] }, '$quantityReserved'] },
      },
      { $inc: { quantityOnHand: delta } },
      { new: true },
    ).lean();
    if (!d) throw new Error('INSUFFICIENT_STOCK_FOR_ADJUSTMENT');
    await InventoryTxModel.create({
      variantId: oid(variantId), type: 'adjustment', quantityDelta: delta, reason, ...(actorId && isId(actorId) ? { actorId: oid(actorId) } : {}),
    });
    return mapDoc<Inventory>(d);
  }

  async reserve(variantId: ID, quantity: number, reference: string) {
    await this.ensure(variantId);
    try {
      await InventoryTxModel.create({ variantId: oid(variantId), type: 'reservation', quantityDelta: quantity, reference });
    } catch (e) {
      if (isDuplicateKey(e)) return 'duplicate' as const;
      throw e;
    }
    const r = await InventoryModel.updateOne(
      { variantId: oid(variantId), $expr: { $gte: [{ $subtract: ['$quantityOnHand', '$quantityReserved'] }, quantity] } },
      { $inc: { quantityReserved: quantity } },
    );
    if (r.modifiedCount === 0) {
      await InventoryTxModel.deleteOne({ variantId: oid(variantId), type: 'reservation', reference });
      return 'insufficient' as const;
    }
    return 'reserved' as const;
  }

  async release(variantId: ID, quantity: number, reference: string) {
    const v = oid(variantId);
    const [reserved, committed] = await Promise.all([
      InventoryTxModel.exists({ variantId: v, type: 'reservation', reference }),
      InventoryTxModel.exists({ variantId: v, type: 'commit', reference }),
    ]);
    if (!reserved || committed) return false;
    try {
      await InventoryTxModel.create({ variantId: v, type: 'release', quantityDelta: -quantity, reference });
    } catch (e) {
      if (isDuplicateKey(e)) return false; // already released
      throw e;
    }
    await InventoryModel.updateOne({ variantId: v, quantityReserved: { $gte: quantity } }, { $inc: { quantityReserved: -quantity } });
    return true;
  }

  async commit(variantId: ID, quantity: number, reference: string) {
    const v = oid(variantId);
    const [reserved, released] = await Promise.all([
      InventoryTxModel.exists({ variantId: v, type: 'reservation', reference }),
      InventoryTxModel.exists({ variantId: v, type: 'release', reference }),
    ]);
    if (!reserved || released) return false;
    try {
      await InventoryTxModel.create({ variantId: v, type: 'commit', quantityDelta: -quantity, reference });
    } catch (e) {
      if (isDuplicateKey(e)) return true; // already committed -> idempotent success
      throw e;
    }
    await InventoryModel.updateOne({ variantId: v }, { $inc: { quantityOnHand: -quantity, quantityReserved: -quantity } });
    return true;
  }

  async restock(variantId: ID, quantity: number, reference: string, reason: string) {
    const v = oid(variantId);
    if (await InventoryTxModel.exists({ variantId: v, type: 'return', reference })) return;
    await this.ensure(variantId);
    await InventoryModel.updateOne({ variantId: v }, { $inc: { quantityOnHand: quantity } });
    await InventoryTxModel.create({ variantId: v, type: 'return', quantityDelta: quantity, reference, reason });
  }

  async listInventory(q: PageQuery & { search?: string; filter?: 'low' | 'out' }) {
    const f: Record<string, any> = {};
    if (q.search) {
      const vs = await VariantModel.find({ $or: [{ sku: new RegExp(escapeRegex(q.search), 'i') }, { label: new RegExp(escapeRegex(q.search), 'i') }] })
        .select('_id').limit(200).lean();
      f.variantId = { $in: vs.map((v) => v._id) };
    }
    if (q.filter === 'out') f.$expr = { $lte: [{ $subtract: ['$quantityOnHand', '$quantityReserved'] }, 0] };
    if (q.filter === 'low') {
      f.$expr = {
        $and: [
          { $lte: [{ $subtract: ['$quantityOnHand', '$quantityReserved'] }, '$lowStockThreshold'] },
          { $gt: [{ $subtract: ['$quantityOnHand', '$quantityReserved'] }, 0] },
        ],
      };
    }
    const [items, total] = await Promise.all([
      InventoryModel.find(f).sort({ updatedAt: -1 }).skip(skip(q)).limit(q.limit).lean(),
      InventoryModel.countDocuments(f),
    ]);
    return paged(
      items.map((d) => {
        const m = mapDoc<Inventory>(d);
        return { ...m, available: m.quantityOnHand - m.quantityReserved };
      }),
      total,
      q,
    );
  }

  async listTransactions(q: PageQuery & { variantId?: ID; type?: InventoryTxType }) {
    const f: Record<string, any> = {};
    if (q.variantId && isId(q.variantId)) f.variantId = oid(q.variantId);
    if (q.type) f.type = q.type;
    const [items, total] = await Promise.all([
      InventoryTxModel.find(f).sort({ createdAt: -1 }).skip(skip(q)).limit(q.limit).lean(),
      InventoryTxModel.countDocuments(f),
    ]);
    return paged(items.map((d) => mapDoc<InventoryTransaction>(d)), total, q);
  }

  async hasTransaction(variantId: ID, type: InventoryTxType, reference: string) {
    return Boolean(await InventoryTxModel.exists({ variantId: oid(variantId), type, reference }));
  }

  async counts() {
    const avail = { $subtract: ['$quantityOnHand', '$quantityReserved'] };
    const [out, low] = await Promise.all([
      InventoryModel.countDocuments({ $expr: { $lte: [avail, 0] } }),
      InventoryModel.countDocuments({ $expr: { $and: [{ $lte: [avail, '$lowStockThreshold'] }, { $gt: [avail, 0] }] } }),
    ]);
    return { lowStock: low, outOfStock: out };
  }
}
