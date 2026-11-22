/**
 * Repository contracts. Business services depend ONLY on these interfaces and domain types.
 * MongoDB implementations live in ./mongo. A future MySQL implementation implements the same contracts.
 * Filters are typed, explicit arguments - never raw database query objects.
 */
import type {
  Address, Category, Coupon, ID, Inventory, InventoryTransaction, InventoryTxType, Order, OrderItem,
  OrderStatus, Payment, PaymentRefund, Product, ProductImage, ProductVariant, ProductStatus, Review, Role,
  ShippingMethod, TaxConfiguration, User, UserStatus,
} from '@/types/domain';

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export interface PageQuery {
  page: number;
  limit: number;
}

/* ---------------------------------- Users ---------------------------------- */
export interface UserListQuery extends PageQuery {
  search?: string;
  roleKeys?: string[];
  excludeRoleKeys?: string[];
  status?: UserStatus;
}
export interface IUserRepository {
  findById(id: ID): Promise<User | null>;
  findByEmail(email: string, withPassword?: boolean): Promise<User | null>;
  create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  update(id: ID, patch: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User | null>;
  setPasswordHash(id: ID, hash: string): Promise<void>;
  list(q: UserListQuery): Promise<Page<User>>;
  countByRole(roleKeys: string[]): Promise<number>;
  // one-time tokens (hashes only)
  setEmailVerifyToken(id: ID, tokenHash: string, expiresAt: Date): Promise<void>;
  consumeEmailVerifyToken(tokenHash: string): Promise<User | null>;
  setResetToken(id: ID, tokenHash: string, expiresAt: Date): Promise<void>;
  consumeResetToken(tokenHash: string): Promise<User | null>;
  // brute force protection
  recordLoginFailure(id: ID, lockAfter: number, lockMs: number): Promise<void>;
  recordLoginSuccess(id: ID): Promise<void>;
  getLockedUntil(id: ID): Promise<Date | null>;
}

export interface ISessionRepository {
  create(s: { userId: ID; tokenHash: string; ip?: string; userAgent?: string; expiresAt: Date }): Promise<{ id: ID }>;
  findActiveByTokenHash(tokenHash: string): Promise<{ id: ID; userId: ID; expiresAt: Date } | null>;
  revoke(id: ID): Promise<void>;
  revokeAllForUser(userId: ID): Promise<number>;
  listActiveForUser(userId: ID): Promise<{ id: ID; ip?: string; userAgent?: string; createdAt: Date; expiresAt: Date }[]>;
}

export interface IRoleRepository {
  findById(id: ID): Promise<Role | null>;
  findByKey(key: string): Promise<Role | null>;
  list(): Promise<Role[]>;
  create(data: Pick<Role, 'key' | 'name' | 'description' | 'isSystem' | 'permissions'>): Promise<Role>;
  update(id: ID, patch: Partial<Pick<Role, 'name' | 'description' | 'permissions'>>): Promise<Role | null>;
  delete(id: ID): Promise<boolean>;
  upsertByKey(data: Pick<Role, 'key' | 'name' | 'description' | 'isSystem' | 'permissions'>): Promise<Role>;
}

export interface IAddressRepository {
  listByUser(userId: ID): Promise<Address[]>;
  findByIdForUser(id: ID, userId: ID): Promise<Address | null>;
  create(data: Omit<Address, 'id'>): Promise<Address>;
  update(id: ID, userId: ID, patch: Partial<Omit<Address, 'id' | 'userId'>>): Promise<Address | null>;
  delete(id: ID, userId: ID): Promise<boolean>;
}

/* -------------------------------- Categories -------------------------------- */
export interface ICategoryRepository {
  findById(id: ID): Promise<Category | null>;
  findBySlug(slug: string): Promise<Category | null>;
  list(opts?: { activeOnly?: boolean }): Promise<Category[]>;
  create(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category>;
  update(id: ID, patch: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Category | null>;
  delete(id: ID): Promise<boolean>;
  countChildren(id: ID): Promise<number>;
  countProducts(id: ID): Promise<number>;
}

/* --------------------------------- Products --------------------------------- */
export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'popularity' | 'rating';
export interface ProductListQuery extends PageQuery {
  search?: string;
  categoryIds?: ID[];
  status?: ProductStatus | ProductStatus[];
  minPricePaise?: number;
  maxPricePaise?: number;
  inStockOnly?: boolean;
  minRating?: number;
  featured?: boolean;
  bestSeller?: boolean;
  newArrival?: boolean;
  sort?: ProductSort;
  excludeIds?: ID[];
  ids?: ID[];
}
export interface IProductRepository {
  findById(id: ID): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
  findByIds(ids: ID[]): Promise<Product[]>;
  list(q: ProductListQuery): Promise<Page<Product>>;
  /** Names, slugs and SKUs matching a term (used for search suggestions). */
  suggest(term: string, limit: number): Promise<{ name: string; slug: string }[]>;
  create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'ratingAverage' | 'ratingCount' | 'salesCount'>): Promise<Product>;
  update(id: ID, patch: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Product | null>;
  delete(id: ID): Promise<boolean>;
  /** Number of products per category for the given status, in ONE grouped query (replaces a count query per category). */
  countByCategory(status: ProductStatus): Promise<Record<ID, number>>;
  incrementSales(items: { productId: ID; quantity: number }[]): Promise<void>;
  setRating(id: ID, average: number, count: number): Promise<void>;

  listVariants(productIds: ID[], opts?: { activeOnly?: boolean }): Promise<ProductVariant[]>;
  findVariantsByIds(ids: ID[]): Promise<ProductVariant[]>;
  findVariantBySku(sku: string): Promise<ProductVariant | null>;
  createVariant(data: Omit<ProductVariant, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductVariant>;
  updateVariant(id: ID, patch: Partial<Omit<ProductVariant, 'id' | 'productId' | 'createdAt' | 'updatedAt'>>): Promise<ProductVariant | null>;
  deleteVariant(id: ID): Promise<boolean>;
  /** Variants matching SKU text, for search by SKU. */
  productIdsBySkuTerm(term: string): Promise<ID[]>;

  listImages(productIds: ID[]): Promise<ProductImage[]>;
  addImage(data: Omit<ProductImage, 'id'>): Promise<ProductImage>;
  findImage(id: ID): Promise<ProductImage | null>;
  deleteImage(id: ID): Promise<boolean>;
  countImages(productId: ID): Promise<number>;
  countImageReferences(publicId: string): Promise<number>;
  reorderImages(productId: ID, orderedIds: ID[]): Promise<void>;
}

/* --------------------------------- Inventory --------------------------------- */
export interface IInventoryRepository {
  getByVariantIds(variantIds: ID[]): Promise<Inventory[]>;
  ensure(variantId: ID, initialQty?: number, lowStockThreshold?: number): Promise<Inventory>;
  setThreshold(variantId: ID, threshold: number): Promise<void>;
  /** Adjust on-hand stock by delta (negative allowed but never below reserved). */
  adjust(variantId: ID, delta: number, reason: string, actorId?: ID): Promise<Inventory>;
  /** Atomically reserve; returns false when insufficient available stock. Idempotent per (variant, reference). */
  reserve(variantId: ID, quantity: number, reference: string): Promise<'reserved' | 'insufficient' | 'duplicate'>;
  /** Releases a reservation made for `reference`. Idempotent. */
  release(variantId: ID, quantity: number, reference: string): Promise<boolean>;
  /** Converts a reservation into a sale (reduces on-hand and reserved). Idempotent. */
  commit(variantId: ID, quantity: number, reference: string): Promise<boolean>;
  restock(variantId: ID, quantity: number, reference: string, reason: string): Promise<void>;
  listInventory(q: PageQuery & { search?: string; filter?: 'low' | 'out' }): Promise<Page<Inventory & { available: number }>>;
  listTransactions(q: PageQuery & { variantId?: ID; type?: InventoryTxType }): Promise<Page<InventoryTransaction>>;
  hasTransaction(variantId: ID, type: InventoryTxType, reference: string): Promise<boolean>;
  counts(): Promise<{ lowStock: number; outOfStock: number }>;
}

/* ---------------------------------- Orders ---------------------------------- */
export interface OrderListQuery extends PageQuery {
  search?: string;
  status?: OrderStatus;
  paymentStatus?: string;
  userId?: ID;
  from?: Date;
  to?: Date;
}
export interface RevenuePoint {
  date: string;
  revenuePaise: number;
  orders: number;
}
export interface IOrderRepository {
  create(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>, items: Omit<OrderItem, 'id' | 'orderId'>[]): Promise<Order>;
  findById(id: ID): Promise<Order | null>;
  findByIdForUser(id: ID, userId: ID): Promise<Order | null>;
  findByIdempotencyKey(userId: ID, key: string): Promise<Order | null>;
  items(orderId: ID): Promise<OrderItem[]>;
  list(q: OrderListQuery): Promise<Page<Order>>;
  /** Appends to status history and sets status (and optional payment status). */
  updateStatus(id: ID, status: OrderStatus, note?: string, actorId?: ID, paymentStatus?: Order['paymentStatus']): Promise<Order | null>;
  /** Atomic compare-and-set used for idempotent payment confirmation. */
  transitionIf(id: ID, fromStatuses: OrderStatus[], status: OrderStatus, patch: Partial<Order>, note?: string): Promise<Order | null>;
  setTracking(id: ID, tracking: NonNullable<Order['tracking']>): Promise<Order | null>;
  setPaymentStatus(id: ID, paymentStatus: Order['paymentStatus']): Promise<void>;
  findExpiredReservations(now: Date, limit: number): Promise<Order[]>;
  nextOrderNumber(): Promise<string>;
  countByUserForCoupon(userId: ID, couponId: ID): Promise<number>;
  hasUserPurchased(userId: ID, productId: ID): Promise<boolean>;
  hasOrderItemsForProduct(productId: ID): Promise<boolean>;
  // analytics (aggregations kept behind the repository)
  summary(from?: Date, to?: Date): Promise<{ revenuePaise: number; orders: number; paidOrders: number; pendingOrders: number; avgOrderPaise: number }>;
  revenueSeries(from: Date, to: Date): Promise<RevenuePoint[]>;
  statusBreakdown(from?: Date, to?: Date): Promise<{ status: string; count: number }[]>;
  topProducts(from: Date | undefined, to: Date | undefined, limit: number): Promise<{ productId: ID; name: string; quantity: number; revenuePaise: number }[]>;
  customerStats(userId: ID): Promise<{ orders: number; spentPaise: number }>;
}

/* --------------------------------- Payments --------------------------------- */
export interface IPaymentRepository {
  create(data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment>;
  findById(id: ID): Promise<Payment | null>;
  findByProviderOrderId(providerOrderId: string): Promise<Payment | null>;
  findByProviderPaymentId(providerPaymentId: string): Promise<Payment | null>;
  listByOrder(orderId: ID): Promise<Payment[]>;
  update(id: ID, patch: Partial<Omit<Payment, 'id' | 'orderId' | 'createdAt' | 'updatedAt'>>): Promise<Payment | null>;
  list(q: PageQuery & { status?: string; search?: string }): Promise<Page<Payment>>;
  stats(): Promise<{ successful: number; failed: number; capturedPaise: number }>;
  /** Returns false if the event id was already recorded (duplicate webhook). */
  recordEvent(e: { eventId: string; type: string; providerPaymentId?: string; providerOrderId?: string }): Promise<boolean>;
  markEventProcessed(eventId: string, outcome: string): Promise<void>;
  /** Removes an event record so a provider retry can be processed again after a transient failure. */
  forgetEvent(eventId: string): Promise<void>;
  createRefund(data: Omit<PaymentRefund, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentRefund>;
  updateRefund(id: ID, patch: Partial<Pick<PaymentRefund, 'status' | 'providerRefundId'>>): Promise<PaymentRefund | null>;
  findRefundByProviderId(providerRefundId: string): Promise<PaymentRefund | null>;
  listRefunds(paymentId: ID): Promise<PaymentRefund[]>;
}

/* --------------------------------- Coupons ---------------------------------- */
export interface ICouponRepository {
  findByCode(code: string): Promise<Coupon | null>;
  findById(id: ID): Promise<Coupon | null>;
  list(q: PageQuery): Promise<Page<Coupon>>;
  create(data: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt' | 'usedCount'>): Promise<Coupon>;
  update(id: ID, patch: Partial<Omit<Coupon, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Coupon | null>;
  delete(id: ID): Promise<boolean>;
  /** Idempotent per order: records usage and increments counter exactly once. */
  recordUsage(couponId: ID, userId: ID, orderId: ID, discountPaise: number): Promise<boolean>;
}

/* --------------------------------- Reviews ---------------------------------- */
export interface IReviewRepository {
  create(data: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>): Promise<Review>;
  findById(id: ID): Promise<Review | null>;
  list(q: PageQuery & { productId?: ID; userId?: ID; status?: Review['status'] }): Promise<Page<Review>>;
  setStatus(id: ID, status: Review['status']): Promise<Review | null>;
  delete(id: ID): Promise<boolean>;
  ratingStats(productId?: ID): Promise<{ average: number; count: number }>;
  distribution(): Promise<{ rating: number; count: number }[]>;
}

/* ---------------------------- Config-style entities ---------------------------- */
export interface IShippingRepository {
  list(opts?: { activeOnly?: boolean }): Promise<ShippingMethod[]>;
  findById(id: ID): Promise<ShippingMethod | null>;
  create(d: Omit<ShippingMethod, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShippingMethod>;
  update(id: ID, p: Partial<Omit<ShippingMethod, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ShippingMethod | null>;
  delete(id: ID): Promise<boolean>;
  listTax(): Promise<TaxConfiguration[]>;
  createTax(d: Omit<TaxConfiguration, 'id' | 'createdAt' | 'updatedAt'>): Promise<TaxConfiguration>;
  updateTax(id: ID, p: Partial<Omit<TaxConfiguration, 'id' | 'createdAt' | 'updatedAt'>>): Promise<TaxConfiguration | null>;
  deleteTax(id: ID): Promise<boolean>;
}

export interface ISettingsRepository {
  get<T = unknown>(key: string): Promise<T | null>;
  getMany(keys: string[]): Promise<Record<string, unknown>>;
  set(key: string, value: unknown): Promise<void>;
}

export interface AuditRecord {
  id: ID;
  userId?: ID;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ip?: string;
  before?: unknown;
  after?: unknown;
  meta?: unknown;
  createdAt: Date;
}
/** Append-only. No update/delete methods exist on purpose. */
export interface IAuditRepository {
  append(r: Omit<AuditRecord, 'id' | 'createdAt'>): Promise<void>;
  list(q: PageQuery & { userId?: ID; action?: string; resourceType?: string }): Promise<Page<AuditRecord>>;
}

/* Simple content collections share a small CRUD contract. */
export interface ICrudRepository<T extends { id: ID }> {
  findById(id: ID): Promise<T | null>;
  list(q: PageQuery & { filter?: Record<string, string | boolean | number> }): Promise<Page<T>>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: ID, patch: Partial<Omit<T, 'id'>>): Promise<T | null>;
  delete(id: ID): Promise<boolean>;
}

export interface IUserDataRepository {
  // cart
  getCart(userId: ID): Promise<{ variantId: ID; quantity: number }[]>;
  replaceCart(userId: ID, items: { variantId: ID; quantity: number }[]): Promise<void>;
  // wishlist
  getWishlist(userId: ID): Promise<ID[]>;
  addToWishlist(userId: ID, productId: ID): Promise<void>;
  removeFromWishlist(userId: ID, productId: ID): Promise<void>;
  // newsletter
  subscribe(email: string): Promise<void>;
}

export interface Repositories {
  users: IUserRepository;
  sessions: ISessionRepository;
  roles: IRoleRepository;
  addresses: IAddressRepository;
  categories: ICategoryRepository;
  products: IProductRepository;
  inventory: IInventoryRepository;
  orders: IOrderRepository;
  payments: IPaymentRepository;
  coupons: ICouponRepository;
  reviews: IReviewRepository;
  shipping: IShippingRepository;
  settings: ISettingsRepository;
  audit: IAuditRepository;
  userData: IUserDataRepository;
  banners: ICrudRepository<BannerRecord>;
  pages: ICrudRepository<PageRecord>;
  notifications: ICrudRepository<NotificationRecord>;
}

export interface BannerRecord {
  id: ID;
  placement: 'hero' | 'promo' | 'announcement';
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  image?: { publicId: string; url: string };
  displayOrder: number;
  isActive: boolean;
}
export interface PageRecord {
  id: ID;
  slug: string;
  title: string;
  kind: 'policy' | 'static' | 'faq' | 'section';
  content: string;
  faqs: { question: string; answer: string }[];
  isPublished: boolean;
  seo?: { title?: string; description?: string };
}
export interface NotificationRecord {
  id: ID;
  type: string;
  audience: 'admin' | 'user';
  title?: string;
  body?: string;
  data?: unknown;
  readAt?: Date | null;
}
