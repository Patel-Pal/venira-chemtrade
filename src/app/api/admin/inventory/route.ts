import { z } from 'zod';
import { route, parseBody, parseQuery } from '@/lib/api';
import { getRepos } from '@/database/repositories';
import { audit } from '@/modules/audit/audit.service';
import { Errors } from '@/lib/errors';
import { pageQuerySchema, stockAdjustSchema } from '@/schemas';
import { revalidateCatalog } from '@/lib/cache';

export const GET = route({ access: 'staff', permission: 'inventory.read' }, async ({ req }) => {
  const q = parseQuery(req, pageQuerySchema.extend({ search: z.string().trim().max(60).optional(), filter: z.enum(['low', 'out']).optional() }));
  const repos = await getRepos();
  const page = await repos.inventory.listInventory(q);
  const variants = await repos.products.findVariantsByIds(page.items.map((i) => i.variantId));
  const products = await repos.products.findByIds([...new Set(variants.map((v) => v.productId))]);
  return {
    ...page,
    items: page.items.map((i) => {
      const v = variants.find((x) => x.id === i.variantId);
      const p = products.find((x) => x.id === v?.productId);
      return { ...i, sku: v?.sku, variantLabel: v?.label, productName: p?.name, productId: p?.id, status: i.available <= 0 ? 'out' : i.available <= i.lowStockThreshold ? 'low' : 'ok' };
    }),
    counts: await repos.inventory.counts(),
  };
});

/** Stock adjustment (delta), always logged to inventory_transactions + audit log. */
export const POST = route({ access: 'staff', permission: 'inventory.adjust' }, async ({ req, auth, ip }) => {
  const b = await parseBody(req, stockAdjustSchema);
  const repos = await getRepos();
  const v = (await repos.products.findVariantsByIds([b.variantId]))[0];
  if (!v) throw Errors.notFound('Variant not found');
  if (!v.trackInventory) throw Errors.badRequest('Inventory tracking is off for this variant');
  const before = (await repos.inventory.getByVariantIds([b.variantId]))[0];
  try {
    const after = await repos.inventory.adjust(b.variantId, b.delta, b.reason, auth!.user.id);
    await audit({ userId: auth!.user.id, ip, action: 'inventory.adjust', resourceType: 'variant', resourceId: b.variantId, before: { onHand: before?.quantityOnHand ?? 0 }, after: { onHand: after.quantityOnHand }, meta: { reason: b.reason } });
    revalidateCatalog(); // customers should see the new availability
    return after;
  } catch (e) {
    if (e instanceof Error && e.message === 'INSUFFICIENT_STOCK_FOR_ADJUSTMENT') throw Errors.unprocessable('Adjustment would reduce stock below reserved quantity');
    throw e;
  }
});

/** PUT: set low-stock threshold. */
export const PUT = route({ access: 'staff', permission: 'inventory.adjust' }, async ({ req }) => {
  const b = await parseBody(req, z.object({ variantId: z.string().regex(/^[a-f0-9]{24}$/i), lowStockThreshold: z.number().int().min(0).max(100000) }));
  const repos = await getRepos();
  await repos.inventory.ensure(b.variantId);
  await repos.inventory.setThreshold(b.variantId, b.lowStockThreshold);
  return { updated: true };
});
