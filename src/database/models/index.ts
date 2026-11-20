/**
 * Mongoose schemas for every collection. Each independent entity has its own collection and
 * references others by ObjectId, so each maps 1:1 to a future MySQL table with foreign keys.
 * See docs/DATABASE_ARCHITECTURE.md.
 */
import mongoose, { Schema, type Model, type InferSchemaType } from 'mongoose';
import { ORDER_STATUSES } from '@/types/domain';

const oid = Schema.Types.ObjectId;
const opts = { timestamps: true, versionKey: false } as const;

// Re-use compiled models across hot reloads; types are inferred from each schema definition.
function model<S extends Schema>(name: string, schema: S, collection: string): Model<InferSchemaType<S>> {
  const existing = mongoose.models[name];
  return (existing ?? mongoose.model(name, schema, collection)) as unknown as Model<InferSchemaType<S>>;
}

/* ------------------------------ Auth / RBAC ------------------------------ */
const permissionSchema = new Schema(
  { key: { type: String, required: true, unique: true }, description: String, module: String },
  opts,
);
export const PermissionModel = model('Permission', permissionSchema, 'permissions');

const roleSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: String,
    isSystem: { type: Boolean, default: false },
    permissions: [String], // -> role_permissions in MySQL
  },
  opts,
);
export const RoleModel = model('Role', roleSchema, 'roles');

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    phone: String,
    passwordHash: { type: String, select: false },
    roleId: { type: oid, ref: 'Role', required: true, index: true },
    roleKey: { type: String, required: true, index: true },
    extraPermissions: [String],
    status: { type: String, enum: ['pending', 'active', 'blocked', 'deactivated'], default: 'pending', index: true },
    emailVerified: { type: Boolean, default: false },
    authProviders: [{ provider: String, providerUserId: String, _id: false }],
    lastLoginAt: Date,
    emailVerifyTokenHash: { type: String, select: false },
    emailVerifyExpiresAt: { type: Date, select: false },
    resetTokenHash: { type: String, select: false },
    resetTokenExpiresAt: { type: Date, select: false },
    failedLoginCount: { type: Number, default: 0 },
    lockedUntil: Date,
  },
  opts,
);
userSchema.index({ name: 'text', email: 'text' });
export const UserModel = model('User', userSchema, 'users');

const sessionSchema = new Schema(
  {
    userId: { type: oid, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    ip: String,
    userAgent: String,
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
  },
  opts,
);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 }); // purge a week after expiry
export const SessionModel = model('Session', sessionSchema, 'sessions');

const addressSchema = new Schema(
  {
    userId: { type: oid, ref: 'User', required: true, index: true },
    label: String,
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: 'IN' },
    gstin: String,
    isDefaultShipping: { type: Boolean, default: false },
    isDefaultBilling: { type: Boolean, default: false },
  },
  opts,
);
export const AddressModel = model('UserAddress', addressSchema, 'user_addresses');

/* -------------------------------- Catalogue ------------------------------- */
const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: String,
    parentId: { type: oid, ref: 'Category', default: null, index: true },
    image: { publicId: String, url: String, _id: false },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  opts,
);
export const CategoryModel = model('Category', categorySchema, 'categories');

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    categoryId: { type: oid, ref: 'Category', required: true, index: true },
    shortDescription: String,
    description: String,
    benefits: [String],
    ingredients: [String],
    howToUse: String,
    specifications: [{ label: String, value: String, _id: false }],
    tags: [String],
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isBestSeller: { type: Boolean, default: false, index: true },
    isNewArrival: { type: Boolean, default: false, index: true },
    seo: { title: String, description: String, _id: false },
    sourceName: String,
    dataStatus: { type: String, enum: ['verified', 'pending_admin_input'], default: 'pending_admin_input' },
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0, index: true },
  },
  opts,
);
productSchema.index({ name: 'text', shortDescription: 'text', description: 'text', tags: 'text' });
productSchema.index({ status: 1, createdAt: -1 });
export const ProductModel = model('Product', productSchema, 'products');

const variantSchema = new Schema(
  {
    productId: { type: oid, ref: 'Product', required: true, index: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    label: { type: String, required: true },
    pricePaise: { type: Number, default: null, min: 0 },
    compareAtPricePaise: { type: Number, default: null, min: 0 },
    trackInventory: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  opts,
);
export const VariantModel = model('ProductVariant', variantSchema, 'product_variants');

const imageSchema = new Schema(
  {
    productId: { type: oid, ref: 'Product', required: true, index: true },
    publicId: { type: String, required: true },
    url: { type: String, required: true },
    format: String,
    width: Number,
    height: Number,
    alt: String,
    displayOrder: { type: Number, default: 0 },
  },
  opts,
);
imageSchema.index({ productId: 1, displayOrder: 1 });
imageSchema.index({ publicId: 1 });
export const ImageModel = model('ProductImage', imageSchema, 'product_images');

const inventorySchema = new Schema(
  {
    variantId: { type: oid, ref: 'ProductVariant', required: true, unique: true },
    quantityOnHand: { type: Number, default: 0, min: 0 },
    quantityReserved: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 10 },
  },
  opts,
);
export const InventoryModel = model('Inventory', inventorySchema, 'inventory');

const inventoryTxSchema = new Schema(
  {
    variantId: { type: oid, ref: 'ProductVariant', required: true, index: true },
    type: { type: String, enum: ['initial', 'adjustment', 'reservation', 'release', 'commit', 'return'], required: true },
    quantityDelta: { type: Number, required: true },
    reference: { type: String, index: true },
    reason: String,
    actorId: { type: oid, ref: 'User' },
  },
  opts,
);
inventoryTxSchema.index({ createdAt: -1 });
// A given order can reserve / commit / release a variant at most once per type -> idempotent stock handling.
inventoryTxSchema.index(
  { variantId: 1, type: 1, reference: 1 },
  { unique: true, partialFilterExpression: { type: { $in: ['reservation', 'release', 'commit'] }, reference: { $type: 'string' } } },
);
export const InventoryTxModel = model('InventoryTransaction', inventoryTxSchema, 'inventory_transactions');

/* --------------------------- Cart / Wishlist ---------------------------- */
const cartSchema = new Schema({ userId: { type: oid, ref: 'User', required: true, unique: true } }, opts);
export const CartModel = model('Cart', cartSchema, 'carts');

const cartItemSchema = new Schema(
  {
    cartId: { type: oid, ref: 'Cart', required: true, index: true },
    variantId: { type: oid, ref: 'ProductVariant', required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  opts,
);
cartItemSchema.index({ cartId: 1, variantId: 1 }, { unique: true });
export const CartItemModel = model('CartItem', cartItemSchema, 'cart_items');

const wishlistSchema = new Schema({ userId: { type: oid, ref: 'User', required: true, unique: true } }, opts);
export const WishlistModel = model('Wishlist', wishlistSchema, 'wishlists');

const wishlistItemSchema = new Schema(
  {
    wishlistId: { type: oid, ref: 'Wishlist', required: true, index: true },
    productId: { type: oid, ref: 'Product', required: true },
  },
  opts,
);
wishlistItemSchema.index({ wishlistId: 1, productId: 1 }, { unique: true });
export const WishlistItemModel = model('WishlistItem', wishlistItemSchema, 'wishlist_items');

/* ------------------------------ Orders / Payments ------------------------------ */
const addrSnapshot = {
  fullName: String, phone: String, line1: String, line2: String, city: String,
  state: String, postalCode: String, country: String, gstin: String, label: String, _id: false,
};

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    userId: { type: oid, ref: 'User', required: true, index: true },
    customerEmail: { type: String, required: true },
    customerPhone: String,
    status: { type: String, enum: ORDER_STATUSES, default: 'payment_pending', index: true },
    paymentStatus: {
      type: String, enum: ['unpaid', 'paid', 'failed', 'refunded', 'partially_refunded'], default: 'unpaid', index: true,
    },
    currency: { type: String, default: 'INR' },
    subtotalPaise: { type: Number, required: true },
    discountPaise: { type: Number, default: 0 },
    shippingPaise: { type: Number, default: 0 },
    taxPaise: { type: Number, default: 0 },
    totalPaise: { type: Number, required: true },
    couponId: { type: oid, ref: 'Coupon', default: null },
    couponCode: String,
    shippingAddress: addrSnapshot,
    billingAddress: addrSnapshot,
    shippingMethod: { id: { type: oid, ref: 'ShippingMethod' }, name: String, pricePaise: Number, _id: false },
    tracking: { carrier: String, trackingNumber: String, url: String, _id: false },
    statusHistory: [{ status: String, at: Date, note: String, actorId: oid, _id: false }], // -> order_status_history
    reservedUntil: { type: Date, default: null, index: true },
    idempotencyKey: String,
    notes: String,
  },
  opts,
);
orderSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
orderSchema.index({ createdAt: -1 });
export const OrderModel = model('Order', orderSchema, 'orders');

const orderItemSchema = new Schema(
  {
    orderId: { type: oid, ref: 'Order', required: true, index: true },
    productId: { type: oid, ref: 'Product', required: true },
    variantId: { type: oid, ref: 'ProductVariant', required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    variantLabel: { type: String, required: true },
    imageUrl: String,
    unitPricePaise: { type: Number, required: true },
    quantity: { type: Number, required: true },
    lineTotalPaise: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);
export const OrderItemModel = model('OrderItem', orderItemSchema, 'order_items');

const paymentSchema = new Schema(
  {
    orderId: { type: oid, ref: 'Order', required: true, index: true },
    provider: { type: String, default: 'razorpay' },
    providerOrderId: { type: String, required: true, unique: true },
    providerPaymentId: { type: String, default: null },
    status: {
      type: String, enum: ['created', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'], default: 'created', index: true,
    },
    amountPaise: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    method: String,
    signatureVerified: { type: Boolean, default: false },
    verifiedAt: Date,
    failureReason: String,
    refundedPaise: { type: Number, default: 0 },
  },
  opts,
);
// Unique provider payment reference (partial so unpaid attempts with null don't collide).
paymentSchema.index({ providerPaymentId: 1 }, { unique: true, partialFilterExpression: { providerPaymentId: { $type: 'string' } } });
export const PaymentModel = model('Payment', paymentSchema, 'payments');

const paymentEventSchema = new Schema(
  {
    eventId: { type: String, required: true, unique: true }, // Razorpay x-razorpay-event-id: dedupe key
    type: { type: String, required: true },
    providerPaymentId: String,
    providerOrderId: String,
    processedAt: Date,
    outcome: String,
  },
  opts,
);
export const PaymentEventModel = model('PaymentEvent', paymentEventSchema, 'payment_events');

const refundSchema = new Schema(
  {
    paymentId: { type: oid, ref: 'Payment', required: true, index: true },
    orderId: { type: oid, ref: 'Order', required: true, index: true },
    providerRefundId: { type: String, default: null },
    amountPaise: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'processed', 'failed'], default: 'pending' },
    reason: String,
    actorId: { type: oid, ref: 'User' },
  },
  opts,
);
refundSchema.index({ providerRefundId: 1 }, { unique: true, partialFilterExpression: { providerRefundId: { $type: 'string' } } });
export const RefundModel = model('PaymentRefund', refundSchema, 'payment_refunds');

/* ------------------------------ Marketing / content ------------------------------ */
const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: String,
    type: { type: String, enum: ['fixed', 'percentage'], required: true },
    value: { type: Number, required: true, min: 0 },
    minOrderPaise: { type: Number, default: 0 },
    maxDiscountPaise: { type: Number, default: null },
    usageLimit: { type: Number, default: null },
    perCustomerLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    startsAt: Date,
    expiresAt: Date,
    productIds: [{ type: oid, ref: 'Product' }],
    categoryIds: [{ type: oid, ref: 'Category' }],
    isActive: { type: Boolean, default: true },
  },
  opts,
);
export const CouponModel = model('Coupon', couponSchema, 'coupons');

const couponUsageSchema = new Schema(
  {
    couponId: { type: oid, ref: 'Coupon', required: true, index: true },
    userId: { type: oid, ref: 'User', required: true },
    orderId: { type: oid, ref: 'Order', required: true, unique: true },
    discountPaise: Number,
  },
  opts,
);
couponUsageSchema.index({ couponId: 1, userId: 1 });
export const CouponUsageModel = model('CouponUsage', couponUsageSchema, 'coupon_usages');

const reviewSchema = new Schema(
  {
    productId: { type: oid, ref: 'Product', required: true, index: true },
    userId: { type: oid, ref: 'User', required: true },
    userName: String,
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: String,
    body: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    verifiedPurchase: { type: Boolean, default: false },
  },
  opts,
);
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
export const ReviewModel = model('ProductReview', reviewSchema, 'product_reviews');

const bannerSchema = new Schema(
  {
    placement: { type: String, enum: ['hero', 'promo', 'announcement'], required: true, index: true },
    title: String,
    subtitle: String,
    ctaLabel: String,
    ctaUrl: String,
    image: { publicId: String, url: String, _id: false },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    startsAt: Date,
    endsAt: Date,
  },
  opts,
);
export const BannerModel = model('Banner', bannerSchema, 'banners');

const pageSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    kind: { type: String, enum: ['policy', 'static', 'faq', 'section'], default: 'static' },
    content: { type: String, default: '' }, // sanitized markdown-lite text
    faqs: [{ question: String, answer: String, _id: false }],
    isPublished: { type: Boolean, default: true },
    seo: { title: String, description: String, _id: false },
  },
  opts,
);
export const PageModel = model('Page', pageSchema, 'pages');

const notificationSchema = new Schema(
  {
    type: { type: String, required: true, index: true }, // enquiry | order | low_stock | system
    audience: { type: String, enum: ['admin', 'user'], default: 'admin' },
    userId: { type: oid, ref: 'User' },
    title: String,
    body: String,
    data: Schema.Types.Mixed,
    readAt: Date,
  },
  opts,
);
notificationSchema.index({ createdAt: -1 });
export const NotificationModel = model('Notification', notificationSchema, 'notifications');

const newsletterSchema = new Schema(
  { email: { type: String, required: true, unique: true, lowercase: true }, isActive: { type: Boolean, default: true } },
  opts,
);
export const NewsletterModel = model('NewsletterSubscriber', newsletterSchema, 'newsletter_subscribers');

const shippingMethodSchema = new Schema(
  {
    name: { type: String, required: true },
    description: String,
    pricePaise: { type: Number, required: true, min: 0 },
    freeAbovePaise: { type: Number, default: null },
    estimatedDays: String,
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  opts,
);
export const ShippingMethodModel = model('ShippingMethod', shippingMethodSchema, 'shipping_methods');

const taxSchema = new Schema(
  {
    name: { type: String, required: true },
    ratePercent: { type: Number, required: true, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
    appliesToShipping: { type: Boolean, default: false },
  },
  opts,
);
export const TaxModel = model('TaxConfiguration', taxSchema, 'tax_configurations');

const settingSchema = new Schema(
  { key: { type: String, required: true, unique: true }, value: Schema.Types.Mixed, isSecret: { type: Boolean, default: false } },
  opts,
);
export const SettingModel = model('StoreSetting', settingSchema, 'store_settings');

const auditSchema = new Schema(
  {
    userId: { type: oid, ref: 'User', index: true },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, index: true },
    resourceId: String,
    ip: String,
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    meta: Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);
auditSchema.index({ createdAt: -1 });
// Append-only: block updates/deletes via the Mongoose API.
for (const hook of ['updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndDelete', 'deleteOne', 'deleteMany', 'replaceOne'] as const) {
  auditSchema.pre(hook, function () {
    throw new Error('audit_logs is append-only');
  });
}
export const AuditModel = model('AuditLog', auditSchema, 'audit_logs');

export type UserDoc = InferSchemaType<typeof userSchema>;
