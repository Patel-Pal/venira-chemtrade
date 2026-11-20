import { z } from 'zod';
import { getRepos } from '@/database/repositories';
import { Errors } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { productInputSchema } from '@/schemas';
import { generateSku, slugify } from '@/utils/slug';
import { IMAGE_RULES, deleteImage, uploadImage, validateImage } from '@/services/cloudinary';
import { audit } from '../audit/audit.service';
import type { Product } from '@/types/domain';

export type ProductInput = z.infer<typeof productInputSchema>;
type Actor = { userId: string; ip?: string };

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const repos = await getRepos();
  const root = slugify(base) || 'product';
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const hit = await repos.products.findBySlug(candidate);
    if (!hit || hit.id === ignoreId) return candidate;
  }
  throw Errors.conflict('Could not generate a unique slug');
}

async function uniqueSku(name: string, label: string, taken: Set<string>): Promise<string> {
  const repos = await getRepos();
  for (let seq = 1; seq < 500; seq++) {
    const sku = generateSku(name, label, seq);
    if (taken.has(sku)) continue;
    if (!(await repos.products.findVariantBySku(sku))) {
      taken.add(sku);
      return sku;
    }
  }
  throw Errors.conflict('Could not generate a unique SKU');
}

async function syncVariants(productId: string, productName: string, input: ProductInput['variants']) {
  const repos = await getRepos();
  const existing = await repos.products.listVariants([productId]);
  const taken = new Set<string>();
  const keepIds = new Set<string>();

  for (const [idx, v] of input.entries()) {
    const current = v.id ? existing.find((e) => e.id === v.id) : undefined;
    if (v.id && !current) throw Errors.badRequest('Variant does not belong to this product');
    if (v.sku) {
      const clash = await repos.products.findVariantBySku(v.sku);
      if (clash && clash.id !== v.id) throw Errors.conflict(`SKU ${v.sku} is already in use`);
    }
    if (current) {
      keepIds.add(current.id);
      await repos.products.updateVariant(current.id, {
        sku: v.sku ?? current.sku, label: v.label, pricePaise: v.pricePaise, compareAtPricePaise: v.compareAtPricePaise ?? null,
        trackInventory: v.trackInventory, isActive: v.isActive, displayOrder: v.displayOrder || idx,
      });
      if (v.trackInventory) await repos.inventory.ensure(current.id, 0);
    } else {
      const sku = v.sku ?? (await uniqueSku(productName, v.label, taken));
      const created = await repos.products.createVariant({
        productId, sku, label: v.label, pricePaise: v.pricePaise, compareAtPricePaise: v.compareAtPricePaise ?? null,
        trackInventory: v.trackInventory, isActive: v.isActive, displayOrder: v.displayOrder || idx,
      });
      keepIds.add(created.id);
      if (v.trackInventory) await repos.inventory.ensure(created.id, v.initialStock ?? 0);
    }
  }
  // Variants removed in the editor are deactivated (order snapshots may reference them), never hard-deleted.
  for (const e of existing) if (!keepIds.has(e.id) && e.isActive) await repos.products.updateVariant(e.id, { isActive: false });
}

export async function createProduct(input: ProductInput, actor: Actor): Promise<Product> {
  const repos = await getRepos();
  if (!(await repos.categories.findById(input.categoryId))) throw Errors.badRequest('Category does not exist');
  const { variants, slug, ...rest } = input;
  const product = await repos.products.create({ ...rest, slug: await uniqueSlug(slug ?? input.name), seo: input.seo ?? {} });
  await syncVariants(product.id, product.name, variants);
  await audit({ userId: actor.userId, ip: actor.ip, action: 'product.create', resourceType: 'product', resourceId: product.id, after: { name: product.name, status: product.status } });
  return product;
}

export async function updateProduct(id: string, input: ProductInput, actor: Actor): Promise<Product> {
  const repos = await getRepos();
  const before = await repos.products.findById(id);
  if (!before) throw Errors.notFound('Product not found');
  if (!(await repos.categories.findById(input.categoryId))) throw Errors.badRequest('Category does not exist');
  const { variants, slug, ...rest } = input;
  const updated = await repos.products.update(id, { ...rest, slug: slug && slug !== before.slug ? await uniqueSlug(slug, id) : before.slug });
  if (!updated) throw Errors.notFound('Product not found');
  await syncVariants(id, updated.name, variants);
  await audit({
    userId: actor.userId, ip: actor.ip, action: 'product.update', resourceType: 'product', resourceId: id,
    before: { name: before.name, status: before.status, categoryId: before.categoryId },
    after: { name: updated.name, status: updated.status, categoryId: updated.categoryId },
  });
  return updated;
}

/** Soft delete (archive) by default. Hard delete only for products that were never ordered. */
export async function removeProduct(id: string, actor: Actor, hard = false): Promise<'archived' | 'deleted'> {
  const repos = await getRepos();
  const p = await repos.products.findById(id);
  if (!p) throw Errors.notFound('Product not found');
  const ordered = await repos.orders.hasOrderItemsForProduct(id);
  if (!hard || ordered) {
    await repos.products.update(id, { status: 'archived' });
    await audit({ userId: actor.userId, ip: actor.ip, action: 'product.archive', resourceType: 'product', resourceId: id, meta: { orderedBefore: ordered } });
    return 'archived';
  }
  const images = await repos.products.listImages([id]);
  const variants = await repos.products.listVariants([id]);
  for (const v of variants) await repos.products.deleteVariant(v.id);
  for (const im of images) await repos.products.deleteImage(im.id);
  await repos.products.delete(id);
  // Delete Cloudinary assets only after DB rows are gone and no other record references the asset.
  for (const im of images) await safeDestroyAsset(im.publicId);
  await audit({ userId: actor.userId, ip: actor.ip, action: 'product.delete', resourceType: 'product', resourceId: id, before: { name: p.name } });
  return 'deleted';
}

async function safeDestroyAsset(publicId: string) {
  const repos = await getRepos();
  if ((await repos.products.countImageReferences(publicId)) > 0) return;
  try {
    await deleteImage(publicId);
  } catch (e) {
    logger.warn('Cloudinary asset cleanup failed (orphan left for manual cleanup)', { publicId, error: String(e) });
  }
}

export async function addProductImage(productId: string, file: File, actor: Actor, alt?: string) {
  const repos = await getRepos();
  if (!(await repos.products.findById(productId))) throw Errors.notFound('Product not found');
  if ((await repos.products.countImages(productId)) >= IMAGE_RULES.maxPerProduct) {
    throw Errors.badRequest(`A product can have at most ${IMAGE_RULES.maxPerProduct} images`);
  }
  const buf = Buffer.from(await file.arrayBuffer());
  validateImage({ size: file.size, type: file.type }, buf);
  const up = await uploadImage(buf, `products/${productId}`);
  const order = await repos.products.countImages(productId);
  const image = await repos.products.addImage({ productId, ...up, alt: alt?.slice(0, 160), displayOrder: order });
  await audit({ userId: actor.userId, ip: actor.ip, action: 'product.image.add', resourceType: 'product', resourceId: productId, meta: { publicId: up.publicId } });
  return image;
}

export async function replaceProductImage(imageId: string, file: File, actor: Actor) {
  const repos = await getRepos();
  const old = await repos.products.findImage(imageId);
  if (!old) throw Errors.notFound('Image not found');
  const buf = Buffer.from(await file.arrayBuffer());
  validateImage({ size: file.size, type: file.type }, buf);
  const up = await uploadImage(buf, `products/${old.productId}`);
  const added = await repos.products.addImage({ productId: old.productId, ...up, alt: old.alt, displayOrder: old.displayOrder });
  await repos.products.deleteImage(old.id);
  await safeDestroyAsset(old.publicId); // only after the new record exists and the old row is gone
  await audit({ userId: actor.userId, ip: actor.ip, action: 'product.image.replace', resourceType: 'product', resourceId: old.productId });
  return added;
}

export async function removeProductImage(imageId: string, actor: Actor) {
  const repos = await getRepos();
  const img = await repos.products.findImage(imageId);
  if (!img) throw Errors.notFound('Image not found');
  await repos.products.deleteImage(imageId);
  await safeDestroyAsset(img.publicId);
  await audit({ userId: actor.userId, ip: actor.ip, action: 'product.image.delete', resourceType: 'product', resourceId: img.productId });
}

export async function reorderProductImages(productId: string, orderedIds: string[], actor: Actor) {
  const repos = await getRepos();
  await repos.products.reorderImages(productId, orderedIds);
  await audit({ userId: actor.userId, ip: actor.ip, action: 'product.image.reorder', resourceType: 'product', resourceId: productId });
}

/** Admin-facing detail including drafts, all variants, images and stock. */
export async function getAdminProduct(id: string) {
  const repos = await getRepos();
  const product = await repos.products.findById(id);
  if (!product) return null;
  const [variants, images] = await Promise.all([repos.products.listVariants([id]), repos.products.listImages([id])]);
  const inv = await repos.inventory.getByVariantIds(variants.map((v) => v.id));
  const stock = new Map(inv.map((i) => [i.variantId, i]));
  return {
    product, images,
    variants: variants.map((v) => ({ ...v, stock: stock.get(v.id) ? { onHand: stock.get(v.id)!.quantityOnHand, reserved: stock.get(v.id)!.quantityReserved } : null })),
  };
}
