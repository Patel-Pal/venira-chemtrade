import { z } from 'zod';
import { route, parseBody, parseQuery } from '@/lib/api';
import { getRepos } from '@/database/repositories';
import { Errors } from '@/lib/errors';
import { idSchema, pageQuerySchema } from '@/schemas';
import { audit } from '@/modules/audit/audit.service';
import { revalidateCatalog } from '@/lib/cache';

/** One row per active variant, so prices for the whole catalogue can be edited in one table. */
export const GET = route({ access: 'staff', permission: 'products.read' }, async ({ req }) => {
  const q = parseQuery(req, pageQuerySchema.extend({
    search: z.string().trim().max(100).optional(),
    categoryId: idSchema.optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
  }));
  const repos = await getRepos();
  const page = await repos.products.list({ page: q.page, limit: q.limit, search: q.search, status: q.status, categoryIds: q.categoryId ? [q.categoryId] : undefined });
  const ids = page.items.map((p) => p.id);
  const [variants, cats] = await Promise.all([repos.products.listVariants(ids, { activeOnly: true }), repos.categories.list()]);
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  const rows = page.items.flatMap((p) =>
    variants.filter((v) => v.productId === p.id).map((v) => ({
      variantId: v.id, productId: p.id, productName: p.name, category: catName.get(p.categoryId) ?? '-', status: p.status,
      label: v.label, sku: v.sku, pricePaise: v.pricePaise, compareAtPricePaise: v.compareAtPricePaise ?? null,
    })),
  );
  return { ...page, items: rows };
});

const updateSchema = z.object({
  updates: z.array(z.object({
    variantId: idSchema,
    pricePaise: z.number().int().min(0).max(1_000_000_00).nullable(),
    compareAtPricePaise: z.number().int().min(0).max(1_000_000_00).nullable(),
  })).min(1).max(200),
});

/** Bulk update of price / MRP. A null price keeps the item as "price on request". */
export const PATCH = route({ access: 'staff', permission: 'products.update', limit: { bucket: 'bulk-pricing', max: 60, windowMs: 10 * 60_000 } }, async ({ req, auth, ip }) => {
  const { updates } = await parseBody(req, updateSchema);
  for (const u of updates) {
    if (u.compareAtPricePaise !== null && u.pricePaise === null) throw Errors.badRequest('Set a selling price before adding an MRP');
    if (u.compareAtPricePaise !== null && u.pricePaise !== null && u.compareAtPricePaise < u.pricePaise) throw Errors.badRequest('MRP cannot be lower than the selling price');
  }
  const repos = await getRepos();
  const existing = await repos.products.findVariantsByIds(updates.map((u) => u.variantId));
  const byId = new Map(existing.map((v) => [v.id, v]));
  const changes: { variantId: string; sku: string; from: number | null; to: number | null }[] = [];
  for (const u of updates) {
    const cur = byId.get(u.variantId);
    if (!cur) throw Errors.notFound('One of the variants no longer exists');
    await repos.products.updateVariant(u.variantId, { pricePaise: u.pricePaise, compareAtPricePaise: u.compareAtPricePaise });
    changes.push({ variantId: u.variantId, sku: cur.sku, from: cur.pricePaise, to: u.pricePaise });
  }
  await audit({ userId: auth!.user.id, ip, action: 'product.price.bulk', resourceType: 'product', meta: { count: changes.length, changes } });
  revalidateCatalog();
  return { updated: changes.length };
});
