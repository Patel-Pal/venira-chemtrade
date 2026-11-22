import { getRepos } from '@/database/repositories';
import type { Page, ProductListQuery } from '@/database/repositories/interfaces';
import type { Category, Product, ProductImage, ProductVariant } from '@/types/domain';
import { rupeesToPaise } from '@/utils/money';
import { availableStock } from '../orders/pricing';

export interface ProductCardDTO {
  id: string;
  slug: string;
  name: string;
  shortDescription?: string;
  category?: { id: string; name: string; slug: string };
  image?: { url: string; alt?: string };
  minPricePaise: number | null;
  maxPricePaise: number | null;
  compareAtPaise: number | null;
  priceOnRequest: boolean;
  inStock: boolean;
  ratingAverage: number;
  ratingCount: number;
  badges: string[];
  dataStatus: Product['dataStatus'];
  firstVariantId?: string;
}

export interface VariantDTO {
  id: string;
  sku: string;
  label: string;
  pricePaise: number | null;
  compareAtPricePaise: number | null;
  trackInventory: boolean;
  available: number | null; // null when stock is not tracked
  inStock: boolean;
}

export interface ProductDetailDTO extends ProductCardDTO {
  description?: string;
  benefits: string[];
  ingredients: string[];
  howToUse?: string;
  specifications: { label: string; value: string }[];
  tags: string[];
  images: { id: string; url: string; alt?: string; width?: number; height?: number }[];
  variants: VariantDTO[];
  seo: Product['seo'];
  status: Product['status'];
  updatedAt: string;
}

/** Returns the category and all of its descendants (so a parent shows its children's products). */
export function categoryTreeIds(categories: Category[], rootId: string): string[] {
  const ids = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories) {
      if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) {
        ids.add(c.id);
        grew = true;
      }
    }
  }
  return [...ids];
}

async function buildCards(products: Product[]): Promise<ProductCardDTO[]> {
  if (!products.length) return [];
  const repos = await getRepos();
  const ids = products.map((p) => p.id);
  const [variants, images, categories] = await Promise.all([
    repos.products.listVariants(ids, { activeOnly: true }),
    repos.products.listImages(ids),
    repos.categories.list(),
  ]);
  const inv = await repos.inventory.getByVariantIds(variants.filter((v) => v.trackInventory).map((v) => v.id));
  const invByVariant = new Map(inv.map((i) => [i.variantId, i]));
  const catById = new Map(categories.map((c) => [c.id, c]));

  return products.map((p) => {
    const vs = variants.filter((v) => v.productId === p.id);
    const prices = vs.map((v) => v.pricePaise).filter((x): x is number => typeof x === 'number');
    const first = images.find((i) => i.productId === p.id);
    const cat = catById.get(p.categoryId);
    const inStock = vs.length === 0 ? false : vs.some((v) => {
      if (!v.trackInventory) return true;
      const i = invByVariant.get(v.id);
      return i ? availableStock(i.quantityOnHand, i.quantityReserved) > 0 : false;
    });
    const compare = vs.map((v) => v.compareAtPricePaise).filter((x): x is number => typeof x === 'number' && x > 0);
    const badges: string[] = [];
    if (p.isNewArrival) badges.push('New');
    if (p.isBestSeller) badges.push('Best seller');
    if (p.isFeatured) badges.push('Featured');
    if (compare.length && prices.length && Math.min(...compare) > Math.min(...prices)) badges.push('Offer');
    return {
      id: p.id, slug: p.slug, name: p.name, shortDescription: p.shortDescription,
      category: cat ? { id: cat.id, name: cat.name, slug: cat.slug } : undefined,
      image: first ? { url: first.url, alt: first.alt ?? p.name } : undefined,
      minPricePaise: prices.length ? Math.min(...prices) : null,
      maxPricePaise: prices.length ? Math.max(...prices) : null,
      compareAtPaise: compare.length ? Math.min(...compare) : null,
      priceOnRequest: prices.length === 0,
      inStock, ratingAverage: p.ratingAverage, ratingCount: p.ratingCount, badges, dataStatus: p.dataStatus,
      firstVariantId: vs.find((v) => typeof v.pricePaise === 'number')?.id,
    };
  });
}

export interface PublicProductQuery {
  page: number;
  limit: number;
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  minRating?: number;
  sort?: ProductListQuery['sort'];
  featured?: boolean;
  bestSeller?: boolean;
  newArrival?: boolean;
  excludeIds?: string[];
}

export async function listPublicProducts(q: PublicProductQuery): Promise<Page<ProductCardDTO>> {
  const repos = await getRepos();
  let categoryIds: string[] | undefined;
  if (q.category) {
    const cats = await repos.categories.list({ activeOnly: true });
    const match = cats.find((c) => c.slug === q.category);
    if (!match) return { items: [], total: 0, page: q.page, limit: q.limit };
    categoryIds = categoryTreeIds(cats, match.id);
  }
  const page = await repos.products.list({
    page: q.page, limit: q.limit, search: q.q, categoryIds, status: 'published',
    minPricePaise: q.minPrice !== undefined ? rupeesToPaise(q.minPrice) : undefined,
    maxPricePaise: q.maxPrice !== undefined ? rupeesToPaise(q.maxPrice) : undefined,
    inStockOnly: q.inStock, minRating: q.minRating, sort: q.sort, featured: q.featured, bestSeller: q.bestSeller,
    newArrival: q.newArrival, excludeIds: q.excludeIds,
  });
  return { ...page, items: await buildCards(page.items) };
}

export async function getProductsByIds(ids: string[]): Promise<ProductCardDTO[]> {
  const repos = await getRepos();
  const page = await repos.products.list({ page: 1, limit: 50, ids: ids.slice(0, 50), status: 'published' });
  const cards = await buildCards(page.items);
  // preserve requested order
  return ids.map((id) => cards.find((c) => c.id === id)).filter((c): c is ProductCardDTO => Boolean(c));
}

export async function getProductDetail(slug: string, opts: { includeUnpublished?: boolean } = {}): Promise<ProductDetailDTO | null> {
  const repos = await getRepos();
  const p = await repos.products.findBySlug(slug);
  if (!p || (!opts.includeUnpublished && p.status !== 'published')) return null;
  const [[card], variants, images] = await Promise.all([
    buildCards([p]),
    repos.products.listVariants([p.id], { activeOnly: true }),
    repos.products.listImages([p.id]),
  ]);
  const inv = await repos.inventory.getByVariantIds(variants.filter((v) => v.trackInventory).map((v) => v.id));
  const invMap = new Map(inv.map((i) => [i.variantId, i]));
  const variantDtos: VariantDTO[] = variants.map((v: ProductVariant) => {
    const i = invMap.get(v.id);
    const avail = v.trackInventory ? (i ? availableStock(i.quantityOnHand, i.quantityReserved) : 0) : null;
    return {
      id: v.id, sku: v.sku, label: v.label, pricePaise: v.pricePaise, compareAtPricePaise: v.compareAtPricePaise ?? null,
      trackInventory: v.trackInventory, available: avail, inStock: avail === null ? true : avail > 0,
    };
  });
  return {
    ...card,
    description: p.description, benefits: p.benefits, ingredients: p.ingredients, howToUse: p.howToUse,
    specifications: p.specifications, tags: p.tags, seo: p.seo, status: p.status, updatedAt: p.updatedAt.toISOString(),
    images: images.map((im: ProductImage) => ({ id: im.id, url: im.url, alt: im.alt ?? p.name, width: im.width, height: im.height })),
    variants: variantDtos,
  };
}

export async function getRelatedProducts(productId: string, limit = 4): Promise<ProductCardDTO[]> {
  const repos = await getRepos();
  const p = await repos.products.findById(productId);
  if (!p) return [];
  const page = await repos.products.list({ page: 1, limit, categoryIds: [p.categoryId], status: 'published', excludeIds: [p.id], sort: 'popularity' });
  return buildCards(page.items);
}

export async function suggest(term: string) {
  const repos = await getRepos();
  const rx = term.trim();
  if (rx.length < 2) return { products: [], categories: [] };
  const [products, cats] = await Promise.all([repos.products.suggest(rx, 6), repos.categories.list({ activeOnly: true })]);
  const lower = rx.toLowerCase();
  return { products, categories: cats.filter((c) => c.name.toLowerCase().includes(lower)).slice(0, 4).map((c) => ({ name: c.name, slug: c.slug })) };
}

export async function listPublicCategories() {
  const repos = await getRepos();
  // 2 queries total (categories + one grouped count) instead of one count query per category.
  const [cats, direct] = await Promise.all([repos.categories.list({ activeOnly: true }), repos.products.countByCategory('published')]);
  const totalFor = (id: string) => categoryTreeIds(cats, id).reduce((sum, cid) => sum + (direct[cid] ?? 0), 0);
  const countMap = new Map(cats.map((c) => [c.id, totalFor(c.id)] as const));
  return cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, parentId: c.parentId ?? null, image: c.image, productCount: countMap.get(c.id) ?? 0 }));
}
