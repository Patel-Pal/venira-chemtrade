/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ZodTypeAny } from 'zod';
import { getRepos } from '@/database/repositories';
import type { Repositories } from '@/database/repositories/interfaces';
import type { Permission } from '@/constants/permissions';
import { Errors } from '@/lib/errors';
import { sanitizeText } from '@/lib/security';
import { bannerInputSchema, categoryInputSchema, couponInputSchema, pageInputSchema, shippingInputSchema, taxInputSchema } from '@/schemas';
import { slugify } from '@/utils/slug';

interface Ctx {
  repos: Repositories;
}
interface Resource {
  read: Permission;
  write: Permission;
  schema: ZodTypeAny;
  auditType: string;
  list(c: Ctx, q: { page: number; limit: number }): Promise<{ items: unknown[]; total: number }>;
  get(c: Ctx, id: string): Promise<unknown | null>;
  create(c: Ctx, data: any): Promise<{ id: string } & Record<string, unknown>>;
  update(c: Ctx, id: string, data: any): Promise<unknown | null>;
  remove(c: Ctx, id: string): Promise<boolean>;
}

const wrapList = async <T>(items: T[], q: { page: number; limit: number }) => ({ items: items.slice((q.page - 1) * q.limit, q.page * q.limit), total: items.length });

async function uniqueCategorySlug(repos: Repositories, base: string, ignoreId?: string) {
  const root = slugify(base) || 'category';
  for (let i = 0; i < 50; i++) {
    const s = i === 0 ? root : `${root}-${i + 1}`;
    const hit = await repos.categories.findBySlug(s);
    if (!hit || hit.id === ignoreId) return s;
  }
  throw Errors.conflict('Could not generate unique slug');
}

async function assertNoCycle(repos: Repositories, id: string, parentId?: string | null) {
  let cursor = parentId ?? null;
  for (let depth = 0; cursor && depth < 20; depth++) {
    if (cursor === id) throw Errors.badRequest('A category cannot be its own ancestor');
    cursor = (await repos.categories.findById(cursor))?.parentId ?? null;
  }
}

export const RESOURCES: Record<string, Resource> = {
  categories: {
    read: 'categories.read', write: 'categories.manage', schema: categoryInputSchema, auditType: 'category',
    list: async ({ repos }, q) => wrapList(await repos.categories.list(), q),
    get: ({ repos }, id) => repos.categories.findById(id),
    create: async ({ repos }, d) => {
      if (d.parentId && !(await repos.categories.findById(d.parentId))) throw Errors.badRequest('Parent category does not exist');
      return repos.categories.create({ ...d, slug: await uniqueCategorySlug(repos, d.slug ?? d.name), parentId: d.parentId ?? null }) as any;
    },
    update: async ({ repos }, id, d) => {
      const cur = await repos.categories.findById(id);
      if (!cur) return null;
      if (d.parentId) {
        if (!(await repos.categories.findById(d.parentId))) throw Errors.badRequest('Parent category does not exist');
        await assertNoCycle(repos, id, d.parentId);
      }
      return repos.categories.update(id, { ...d, slug: d.slug && d.slug !== cur.slug ? await uniqueCategorySlug(repos, d.slug, id) : cur.slug, parentId: d.parentId ?? null });
    },
    remove: async ({ repos }, id) => {
      if ((await repos.categories.countChildren(id)) > 0) throw Errors.conflict('Delete or move subcategories first');
      if ((await repos.categories.countProducts(id)) > 0) throw Errors.conflict('Move or archive the products in this category first');
      return repos.categories.delete(id);
    },
  },
  coupons: {
    read: 'coupons.manage', write: 'coupons.manage', schema: couponInputSchema, auditType: 'coupon',
    list: ({ repos }, q) => repos.coupons.list(q),
    get: ({ repos }, id) => repos.coupons.findById(id),
    create: async ({ repos }, d) => {
      if (await repos.coupons.findByCode(d.code)) throw Errors.conflict('Coupon code already exists');
      return repos.coupons.create(d) as any;
    },
    update: async ({ repos }, id, d) => {
      const { code: _c, ...rest } = d; // code is immutable once created (usage history)
      return repos.coupons.update(id, rest);
    },
    remove: ({ repos }, id) => repos.coupons.delete(id),
  },
  banners: {
    read: 'content.manage', write: 'content.manage', schema: bannerInputSchema, auditType: 'banner',
    list: async ({ repos }, q) => { const p = await repos.banners.list(q); return { items: p.items, total: p.total }; },
    get: ({ repos }, id) => repos.banners.findById(id),
    create: ({ repos }, d) => repos.banners.create({ ...d, image: d.image ?? undefined }) as any,
    update: ({ repos }, id, d) => repos.banners.update(id, { ...d, image: d.image ?? undefined }),
    remove: ({ repos }, id) => repos.banners.delete(id),
  },
  pages: {
    read: 'content.manage', write: 'content.manage', schema: pageInputSchema, auditType: 'page',
    list: async ({ repos }, q) => { const p = await repos.pages.list(q); return { items: p.items, total: p.total }; },
    get: ({ repos }, id) => repos.pages.findById(id),
    create: async ({ repos }, d) => {
      const dup = await repos.pages.list({ page: 1, limit: 1, filter: { slug: d.slug } });
      if (dup.total) throw Errors.conflict('A page with this slug already exists');
      return repos.pages.create({ ...d, content: sanitizeText(d.content, 50_000) }) as any;
    },
    update: ({ repos }, id, d) => repos.pages.update(id, { ...d, content: sanitizeText(d.content ?? '', 50_000) }),
    remove: ({ repos }, id) => repos.pages.delete(id),
  },
  'shipping-methods': {
    read: 'settings.manage', write: 'settings.manage', schema: shippingInputSchema, auditType: 'shipping_method',
    list: async ({ repos }, q) => wrapList(await repos.shipping.list(), q),
    get: ({ repos }, id) => repos.shipping.findById(id),
    create: ({ repos }, d) => repos.shipping.create(d) as any,
    update: ({ repos }, id, d) => repos.shipping.update(id, d),
    remove: ({ repos }, id) => repos.shipping.delete(id),
  },
  taxes: {
    read: 'settings.manage', write: 'settings.manage', schema: taxInputSchema, auditType: 'tax_configuration',
    list: async ({ repos }, q) => wrapList(await repos.shipping.listTax(), q),
    get: async ({ repos }, id) => (await repos.shipping.listTax()).find((t) => t.id === id) ?? null,
    create: ({ repos }, d) => repos.shipping.createTax(d) as any,
    update: ({ repos }, id, d) => repos.shipping.updateTax(id, d),
    remove: ({ repos }, id) => repos.shipping.deleteTax(id),
  },
};

export async function resourceCtx(): Promise<Ctx> {
  return { repos: await getRepos() };
}
