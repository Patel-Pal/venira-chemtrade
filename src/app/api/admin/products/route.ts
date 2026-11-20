import { z } from 'zod';
import { route, parseBody, parseQuery } from '@/lib/api';
import { getRepos } from '@/database/repositories';
import { pageQuerySchema, productInputSchema } from '@/schemas';
import { createProduct } from '@/modules/products/product-admin.service';
import { revalidateCatalog } from '@/lib/cache';

export const GET = route({ access: 'staff', permission: 'products.read' }, async ({ req }) => {
  const q = parseQuery(req, pageQuerySchema.extend({
    search: z.string().trim().max(100).optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    categoryId: z.string().regex(/^[a-f0-9]{24}$/i).optional(),
  }));
  const repos = await getRepos();
  const page = await repos.products.list({ page: q.page, limit: q.limit, search: q.search, status: q.status, categoryIds: q.categoryId ? [q.categoryId] : undefined });
  const [variants, cats] = await Promise.all([repos.products.listVariants(page.items.map((p) => p.id)), repos.categories.list()]);
  const images = await repos.products.listImages(page.items.map((p) => p.id));
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  return {
    ...page,
    items: page.items.map((p) => {
      const vs = variants.filter((v) => v.productId === p.id);
      const prices = vs.map((v) => v.pricePaise).filter((x): x is number => typeof x === 'number');
      return {
        id: p.id, name: p.name, slug: p.slug, status: p.status, category: catName.get(p.categoryId) ?? '-', isFeatured: p.isFeatured, isBestSeller: p.isBestSeller,
        dataStatus: p.dataStatus, variants: vs.length, minPricePaise: prices.length ? Math.min(...prices) : null, image: images.find((i) => i.productId === p.id)?.url ?? null,
      };
    }),
  };
});

export const POST = route({ access: 'staff', permission: 'products.create' }, async ({ req, auth, ip }) => {
  const body = await parseBody(req, productInputSchema);
  const p = await createProduct(body, { userId: auth!.user.id, ip });
  revalidateCatalog();
  return p;
});
