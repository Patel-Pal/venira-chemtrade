/** Central query-key factory: hierarchical keys make targeted invalidation predictable. */
export const qk = {
  me: ['me'] as const,
  categories: ['categories'] as const,
  products: {
    all: ['products'] as const,
    list: (params: unknown) => ['products', 'list', params] as const,
    detail: (slug: string) => ['products', 'detail', slug] as const,
    byIds: (ids: string[]) => ['products', 'byIds', ids] as const,
    reviews: (slug: string, page = 1) => ['products', 'reviews', slug, page] as const,
    suggest: (q: string) => ['search', 'suggest', q] as const,
  },
  cart: { price: (items: unknown, coupon?: string, ship?: string) => ['cart', 'price', items, coupon ?? '', ship ?? ''] as const },
  orders: { all: ['orders'] as const, list: (page: number) => ['orders', 'list', page] as const, detail: (id: string) => ['orders', 'detail', id] as const },
  addresses: ['addresses'] as const,
  admin: {
    list: (resource: string, params?: unknown) => ['admin', resource, 'list', params ?? {}] as const,
    item: (resource: string, id: string) => ['admin', resource, 'item', id] as const,
    all: (resource: string) => ['admin', resource] as const,
    dashboard: (params: unknown) => ['admin', 'dashboard', params] as const,
  },
  sa: { all: ['super-admin'] as const, list: (r: string, p?: unknown) => ['super-admin', r, p ?? {}] as const },
};
