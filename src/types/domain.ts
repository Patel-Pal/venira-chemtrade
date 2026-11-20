/**
 * Persistence-agnostic domain types. IDs are opaque strings (ObjectId hex in MongoDB, stringified BIGINT/UUID in MySQL).
 * All money fields are integer minor units (paise). All dates are UTC.
 */
export type ID = string;

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export type UserStatus = 'pending' | 'active' | 'blocked' | 'deactivated';

export interface User extends Timestamps {
  id: ID;
  email: string;
  name: string;
  phone?: string;
  passwordHash?: string; // never leaves the service layer
  roleId: ID;
  roleKey: string;
  extraPermissions: string[];
  status: UserStatus;
  emailVerified: boolean;
  authProviders: { provider: string; providerUserId: string }[]; // ready for OAuth
  lastLoginAt?: Date;
}
export type PublicUser = Omit<User, 'passwordHash'>;

export interface Role extends Timestamps {
  id: ID;
  key: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: string[];
}

export interface Address {
  id: ID;
  userId: ID;
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  gstin?: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
}
export type AddressSnapshot = Omit<Address, 'id' | 'userId' | 'isDefaultShipping' | 'isDefaultBilling'>;

export interface Category extends Timestamps {
  id: ID;
  name: string;
  slug: string;
  description?: string;
  parentId?: ID | null;
  image?: { publicId: string; url: string };
  displayOrder: number;
  isActive: boolean;
}

export type ProductStatus = 'draft' | 'published' | 'archived';
export type DataStatus = 'verified' | 'pending_admin_input';

export interface Product extends Timestamps {
  id: ID;
  name: string;
  slug: string;
  categoryId: ID;
  shortDescription?: string;
  description?: string;
  benefits: string[];
  ingredients: string[];
  howToUse?: string;
  specifications: { label: string; value: string }[];
  tags: string[];
  status: ProductStatus;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  seo: { title?: string; description?: string };
  sourceName?: string; // name exactly as printed in the supplier PDF
  dataStatus: DataStatus;
  ratingAverage: number;
  ratingCount: number;
  salesCount: number;
}

export interface ProductVariant extends Timestamps {
  id: ID;
  productId: ID;
  sku: string;
  label: string; // e.g. "1 kg"
  pricePaise: number | null; // null => price on request
  compareAtPricePaise?: number | null;
  trackInventory: boolean;
  isActive: boolean;
  displayOrder: number;
}

export interface ProductImage {
  id: ID;
  productId: ID;
  publicId: string;
  url: string;
  format?: string;
  width?: number;
  height?: number;
  alt?: string;
  displayOrder: number;
}

export interface Inventory extends Timestamps {
  id: ID;
  variantId: ID;
  quantityOnHand: number;
  quantityReserved: number;
  lowStockThreshold: number;
}

export type InventoryTxType = 'initial' | 'adjustment' | 'reservation' | 'release' | 'commit' | 'return';
export interface InventoryTransaction {
  id: ID;
  variantId: ID;
  type: InventoryTxType;
  quantityDelta: number; // change in on-hand (commit/adjustment/return) or reserved (reservation/release)
  reference?: string; // e.g. order id
  reason?: string;
  actorId?: ID;
  createdAt: Date;
}

export const ORDER_STATUSES = [
  'pending', 'payment_pending', 'confirmed', 'processing', 'packed', 'shipped',
  'out_for_delivery', 'delivered', 'cancelled', 'returned', 'refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';

export interface Order extends Timestamps {
  id: ID;
  orderNumber: string;
  userId: ID;
  customerEmail: string;
  customerPhone?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  currency: string;
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  taxPaise: number;
  totalPaise: number;
  couponId?: ID | null;
  couponCode?: string | null;
  shippingAddress: AddressSnapshot;
  billingAddress: AddressSnapshot;
  shippingMethod: { id: ID; name: string; pricePaise: number };
  tracking?: { carrier?: string; trackingNumber?: string; url?: string };
  statusHistory: { status: OrderStatus; at: Date; note?: string; actorId?: ID }[];
  reservedUntil?: Date | null;
  idempotencyKey?: string;
  notes?: string;
}

/** Immutable snapshot of what was bought. Never updated after creation. */
export interface OrderItem {
  id: ID;
  orderId: ID;
  productId: ID;
  variantId: ID;
  productName: string;
  sku: string;
  variantLabel: string;
  imageUrl?: string;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
}

export type PaymentRecordStatus = 'created' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'partially_refunded';
export interface Payment extends Timestamps {
  id: ID;
  orderId: ID;
  provider: 'razorpay';
  providerOrderId: string;
  providerPaymentId?: string | null;
  status: PaymentRecordStatus;
  amountPaise: number;
  currency: string;
  method?: string;
  signatureVerified: boolean;
  verifiedAt?: Date | null;
  failureReason?: string;
  refundedPaise: number;
}

export interface PaymentRefund extends Timestamps {
  id: ID;
  paymentId: ID;
  orderId: ID;
  providerRefundId?: string | null;
  amountPaise: number;
  status: 'pending' | 'processed' | 'failed';
  reason?: string;
  actorId?: ID;
}

export interface Coupon extends Timestamps {
  id: ID;
  code: string;
  description?: string;
  type: 'fixed' | 'percentage';
  value: number; // paise if fixed, percent (0-100) if percentage
  minOrderPaise: number;
  maxDiscountPaise?: number | null;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  usedCount: number;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  productIds: ID[];
  categoryIds: ID[];
  isActive: boolean;
}

export interface Review extends Timestamps {
  id: ID;
  productId: ID;
  userId: ID;
  userName: string;
  rating: number;
  title?: string;
  body: string;
  status: 'pending' | 'approved' | 'rejected';
  verifiedPurchase: boolean;
}

export interface ShippingMethod extends Timestamps {
  id: ID;
  name: string;
  description?: string;
  pricePaise: number;
  freeAbovePaise?: number | null;
  estimatedDays?: string;
  isActive: boolean;
  displayOrder: number;
}

export interface TaxConfiguration extends Timestamps {
  id: ID;
  name: string;
  ratePercent: number;
  isActive: boolean;
  appliesToShipping: boolean;
}
