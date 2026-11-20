import { z } from 'zod';
import { route, parseQuery } from '@/lib/api';
import { getRepos } from '@/database/repositories';
import { pageQuerySchema } from '@/schemas';

export const GET = route({ access: 'staff', permission: 'inventory.read' }, async ({ req }) => {
  const q = parseQuery(req, pageQuerySchema.extend({
    variantId: z.string().regex(/^[a-f0-9]{24}$/i).optional(),
    type: z.enum(['initial', 'adjustment', 'reservation', 'release', 'commit', 'return']).optional(),
  }));
  const repos = await getRepos();
  const page = await repos.inventory.listTransactions(q);
  const variants = await repos.products.findVariantsByIds([...new Set(page.items.map((t) => t.variantId))]);
  return { ...page, items: page.items.map((t) => ({ ...t, sku: variants.find((v) => v.id === t.variantId)?.sku })) };
});
