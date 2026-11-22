/* eslint-disable @typescript-eslint/no-explicit-any */
import { CategoryModel, ImageModel, InventoryModel, ProductModel, VariantModel } from '../../models';
import type { Category, ID, Product, ProductImage, ProductStatus, ProductVariant } from '@/types/domain';
import type { ICategoryRepository, IProductRepository, ProductListQuery } from '../interfaces';
import { cleanPatch, escapeRegex, isId, mapDoc, oid, oids, paged, skip } from './helpers';

/** Mongo omits empty nested objects/arrays; the domain model guarantees they exist. */
function toProduct(d: any): Product {
  const p = mapDoc<Product>(d);
  p.seo ??= {};
  p.benefits ??= [];
  p.ingredients ??= [];
  p.specifications ??= [];
  p.tags ??= [];
  return p;
}

export class MongoCategoryRepository implements ICategoryRepository {
  async findById(id: ID) {
    if (!isId(id)) return null;
    const d = await CategoryModel.findById(id).lean();
    return d ? mapDoc<Category>(d) : null;
  }
  async findBySlug(slug: string) {
    const d = await CategoryModel.findOne({ slug }).lean();
    return d ? mapDoc<Category>(d) : null;
  }
  async list(opts?: { activeOnly?: boolean }) {
    const f = opts?.activeOnly ? { isActive: true } : {};
    return (await CategoryModel.find(f).sort({ displayOrder: 1, name: 1 }).lean()).map((d) => mapDoc<Category>(d));
  }
  async create(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) {
    const d = await CategoryModel.create({ ...data, parentId: data.parentId ? oid(data.parentId) : null });
    return mapDoc<Category>(d.toObject());
  }
  async update(id: ID, patch: any) {
    if (!isId(id)) return null;
    const d = await CategoryModel.findByIdAndUpdate(id, { $set: cleanPatch(patch, ['parentId']) }, { new: true }).lean();
    return d ? mapDoc<Category>(d) : null;
  }
  async delete(id: ID) {
    if (!isId(id)) return false;
    return (await CategoryModel.deleteOne({ _id: id })).deletedCount === 1;
  }
  async countChildren(id: ID) {
    return CategoryModel.countDocuments({ parentId: oid(id) });
  }
  async countProducts(id: ID) {
    return ProductModel.countDocuments({ categoryId: oid(id) });
  }
}

export class MongoProductRepository implements IProductRepository {
  async findById(id: ID) {
    if (!isId(id)) return null;
    const d = await ProductModel.findById(id).lean();
    return d ? toProduct(d) : null;
  }
  async findBySlug(slug: string) {
    const d = await ProductModel.findOne({ slug: String(slug) }).lean();
    return d ? toProduct(d) : null;
  }
  async findByIds(ids: ID[]) {
    return (await ProductModel.find({ _id: { $in: oids(ids) } }).lean()).map((d) => toProduct(d));
  }

  async list(q: ProductListQuery) {
    const f: Record<string, any> = {};
    const and: Record<string, any>[] = [];
    if (q.status) f.status = Array.isArray(q.status) ? { $in: q.status } : q.status;
    if (q.categoryIds?.length) f.categoryId = { $in: oids(q.categoryIds) };
    if (q.featured) f.isFeatured = true;
    if (q.bestSeller) f.isBestSeller = true;
    if (q.newArrival) f.isNewArrival = true;
    if (q.minRating) f.ratingAverage = { $gte: q.minRating };
    if (q.ids) f._id = { $in: oids(q.ids) };
    if (q.excludeIds?.length) f._id = { ...(f._id ?? {}), $nin: oids(q.excludeIds) };

    if (q.search) {
      const rx = new RegExp(escapeRegex(q.search), 'i');
      const [skuIds, cats] = await Promise.all([
        this.productIdsBySkuTerm(q.search),
        CategoryModel.find({ name: rx }).select('_id').lean(),
      ]);
      and.push({
        $or: [
          { name: rx }, { shortDescription: rx }, { description: rx }, { tags: rx }, { sourceName: rx },
          { _id: { $in: oids(skuIds) } },
          { categoryId: { $in: cats.map((c) => c._id) } },
        ],
      });
    }

    // Price / stock filters depend on variants + inventory, so resolve to a product-id set first.
    const needsVariantFilter = q.minPricePaise !== undefined || q.maxPricePaise !== undefined || q.inStockOnly;
    if (needsVariantFilter) {
      const vf: Record<string, any> = { isActive: true };
      if (q.minPricePaise !== undefined || q.maxPricePaise !== undefined) {
        vf.pricePaise = {
          ...(q.minPricePaise !== undefined ? { $gte: q.minPricePaise } : {}),
          ...(q.maxPricePaise !== undefined ? { $lte: q.maxPricePaise } : {}),
        };
      }
      let variants = await VariantModel.find(vf).select('productId trackInventory').lean();
      if (q.inStockOnly) {
        const tracked = variants.filter((v) => v.trackInventory).map((v) => v._id);
        const inv = await InventoryModel.find({ variantId: { $in: tracked } }).lean();
        const okTracked = new Set(inv.filter((i) => i.quantityOnHand - i.quantityReserved > 0).map((i) => String(i.variantId)));
        variants = variants.filter((v) => !v.trackInventory || okTracked.has(String(v._id)));
      }
      and.push({ _id: { $in: [...new Set(variants.map((v) => v.productId))] } });
    }
    if (and.length) f.$and = and;

    const sort = q.sort ?? 'newest';
    if (sort === 'price_asc' || sort === 'price_desc') {
      // Price sort needs min variant price per product; catalogue sizes are modest so sort in memory.
      const all = await ProductModel.find(f).lean();
      const vs = await VariantModel.find({ productId: { $in: all.map((p) => p._id) }, isActive: true }).select('productId pricePaise').lean();
      const min = new Map<string, number>();
      for (const v of vs) {
        if (v.pricePaise === null || v.pricePaise === undefined) continue;
        const k = String(v.productId);
        min.set(k, Math.min(min.get(k) ?? Infinity, v.pricePaise));
      }
      const dir = sort === 'price_asc' ? 1 : -1;
      all.sort((a, b) => {
        const pa = min.get(String(a._id));
        const pb = min.get(String(b._id));
        if (pa === undefined && pb === undefined) return 0;
        if (pa === undefined) return 1; // unpriced always last
        if (pb === undefined) return -1;
        return (pa - pb) * dir;
      });
      const items = all.slice(skip(q), skip(q) + q.limit).map((d) => toProduct(d));
      return paged(items, all.length, q);
    }
    const sortSpec: Record<string, 1 | -1> =
      sort === 'popularity' ? { salesCount: -1, createdAt: -1 } : sort === 'rating' ? { ratingAverage: -1, ratingCount: -1 } : { createdAt: -1, _id: -1 };
    const [items, total] = await Promise.all([
      ProductModel.find(f).sort(sortSpec).skip(skip(q)).limit(q.limit).lean(),
      ProductModel.countDocuments(f),
    ]);
    return paged(items.map((d) => toProduct(d)), total, q);
  }

  async suggest(term: string, limit: number) {
    const rx = new RegExp(escapeRegex(term), 'i');
    const ds = await ProductModel.find({ status: 'published', $or: [{ name: rx }, { tags: rx }] }).select('name slug').limit(limit).lean();
    return ds.map((d) => ({ name: d.name, slug: d.slug }));
  }

  async create(data: any) {
    const d = await ProductModel.create({ ...data, categoryId: oid(data.categoryId) });
    return toProduct(d.toObject());
  }
  async update(id: ID, patch: any) {
    if (!isId(id)) return null;
    const d = await ProductModel.findByIdAndUpdate(id, { $set: cleanPatch(patch, ['categoryId']) }, { new: true }).lean();
    return d ? toProduct(d) : null;
  }
  async delete(id: ID) {
    if (!isId(id)) return false;
    return (await ProductModel.deleteOne({ _id: id })).deletedCount === 1;
  }
  async countByCategory(status: ProductStatus) {
    const rows = await ProductModel.aggregate([{ $match: { status } }, { $group: { _id: '$categoryId', n: { $sum: 1 } } }]);
    return Object.fromEntries(rows.map((r) => [String(r._id), r.n as number]));
  }
  async incrementSales(items: { productId: ID; quantity: number }[]) {
    await Promise.all(items.map((i) => ProductModel.updateOne({ _id: i.productId }, { $inc: { salesCount: i.quantity } })));
  }
  async setRating(id: ID, average: number, count: number) {
    await ProductModel.updateOne({ _id: id }, { $set: { ratingAverage: average, ratingCount: count } });
  }

  /* variants */
  async listVariants(productIds: ID[], opts?: { activeOnly?: boolean }) {
    const f: Record<string, any> = { productId: { $in: oids(productIds) } };
    if (opts?.activeOnly) f.isActive = true;
    return (await VariantModel.find(f).sort({ displayOrder: 1, createdAt: 1 }).lean()).map((d) => mapDoc<ProductVariant>(d));
  }
  async findVariantsByIds(ids: ID[]) {
    return (await VariantModel.find({ _id: { $in: oids(ids) } }).lean()).map((d) => mapDoc<ProductVariant>(d));
  }
  async findVariantBySku(sku: string) {
    const d = await VariantModel.findOne({ sku: String(sku).toUpperCase() }).lean();
    return d ? mapDoc<ProductVariant>(d) : null;
  }
  async createVariant(data: any) {
    const d = await VariantModel.create({ ...data, productId: oid(data.productId) });
    return mapDoc<ProductVariant>(d.toObject());
  }
  async updateVariant(id: ID, patch: any) {
    if (!isId(id)) return null;
    const d = await VariantModel.findByIdAndUpdate(id, { $set: cleanPatch(patch) }, { new: true }).lean();
    return d ? mapDoc<ProductVariant>(d) : null;
  }
  async deleteVariant(id: ID) {
    if (!isId(id)) return false;
    return (await VariantModel.deleteOne({ _id: id })).deletedCount === 1;
  }
  async productIdsBySkuTerm(term: string) {
    const vs = await VariantModel.find({ sku: new RegExp(escapeRegex(term), 'i') }).select('productId').limit(100).lean();
    return vs.map((v) => String(v.productId));
  }

  /* images */
  async listImages(productIds: ID[]) {
    return (await ImageModel.find({ productId: { $in: oids(productIds) } }).sort({ displayOrder: 1 }).lean()).map((d) => mapDoc<ProductImage>(d));
  }
  async addImage(data: Omit<ProductImage, 'id'>) {
    const d = await ImageModel.create({ ...data, productId: oid(data.productId) });
    return mapDoc<ProductImage>(d.toObject());
  }
  async findImage(id: ID) {
    if (!isId(id)) return null;
    const d = await ImageModel.findById(id).lean();
    return d ? mapDoc<ProductImage>(d) : null;
  }
  async deleteImage(id: ID) {
    if (!isId(id)) return false;
    return (await ImageModel.deleteOne({ _id: id })).deletedCount === 1;
  }
  async countImages(productId: ID) {
    return ImageModel.countDocuments({ productId: oid(productId) });
  }
  async countImageReferences(publicId: string) {
    return ImageModel.countDocuments({ publicId });
  }
  async reorderImages(productId: ID, orderedIds: ID[]) {
    await Promise.all(
      orderedIds.filter(isId).map((id, idx) => ImageModel.updateOne({ _id: id, productId: oid(productId) }, { $set: { displayOrder: idx } })),
    );
  }
}
