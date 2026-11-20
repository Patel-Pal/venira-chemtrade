import { z } from 'zod';
import { ORDER_STATUSES } from '@/types/domain';

/* ---------- primitives ---------- */
export const idSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const text = (max = 200) => z.string().trim().max(max);
const optText = (max = 200) => text(max).optional().or(z.literal('').transform(() => undefined));
export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email').max(254);
export const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Include a letter')
  .regex(/\d/, 'Include a number');
export const phoneSchema = z.string().trim().regex(/^\+?[0-9\s-]{8,15}$/, 'Enter a valid phone number');
const pageParams = {
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};
export const pageQuerySchema = z.object(pageParams);
const bool = z.enum(['true', 'false']).transform((v) => v === 'true');

/* ---------- auth ---------- */
export const registerSchema = z.object({ name: text(100).min(2, 'Enter your name'), email: emailSchema, phone: phoneSchema.optional(), password: passwordSchema });
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });
export const forgotSchema = z.object({ email: emailSchema });
export const resetSchema = z.object({ token: z.string().min(20).max(200), password: passwordSchema });
export const verifyEmailSchema = z.object({ token: z.string().min(20).max(200) });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordSchema });
export const profileSchema = z.object({ name: text(100).min(2), phone: phoneSchema.optional().or(z.literal('').transform(() => undefined)) });

/* ---------- address ---------- */
export const addressSchema = z.object({
  label: optText(40),
  fullName: text(100).min(2),
  phone: phoneSchema,
  line1: text(200).min(3),
  line2: optText(200),
  city: text(80).min(2),
  state: text(80).min(2),
  postalCode: z.string().trim().regex(/^[1-9][0-9]{5}$/, 'Enter a 6-digit PIN code'),
  country: z.literal('IN').default('IN'),
  gstin: z.string().trim().toUpperCase().regex(/^[0-9A-Z]{15}$/, 'Invalid GSTIN').optional().or(z.literal('').transform(() => undefined)),
  isDefaultShipping: z.boolean().default(false),
  isDefaultBilling: z.boolean().default(false),
});

/* ---------- catalogue ---------- */
export const productQuerySchema = z.object({
  ...pageParams,
  q: text(100).optional(),
  category: z.string().trim().max(100).optional(), // slug
  minPrice: z.coerce.number().min(0).optional(), // rupees
  maxPrice: z.coerce.number().min(0).optional(),
  inStock: bool.optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popularity', 'rating']).default('newest'),
  featured: bool.optional(),
  bestSeller: bool.optional(),
  newArrival: bool.optional(),
});

const specSchema = z.object({ label: text(80).min(1), value: text(300).min(1) });
export const variantInputSchema = z.object({
  id: idSchema.optional(),
  sku: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,40}$/, 'SKU: letters, numbers and dashes').optional(),
  label: text(60).min(1),
  pricePaise: z.number().int().min(0).max(1_000_000_00).nullable().default(null),
  compareAtPricePaise: z.number().int().min(0).nullable().optional(),
  trackInventory: z.boolean().default(true),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
  initialStock: z.number().int().min(0).max(10_000_000).optional(),
});
export const productInputSchema = z.object({
  name: text(160).min(2),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/).max(120).optional(),
  categoryId: idSchema,
  shortDescription: optText(300),
  description: optText(10_000),
  benefits: z.array(text(300).min(1)).max(30).default([]),
  ingredients: z.array(text(200).min(1)).max(100).default([]),
  howToUse: optText(3000),
  specifications: z.array(specSchema).max(40).default([]),
  tags: z.array(text(40).min(1)).max(30).default([]),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  isFeatured: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  seo: z.object({ title: optText(70), description: optText(170) }).default({}),
  dataStatus: z.enum(['verified', 'pending_admin_input']).default('verified'),
  variants: z.array(variantInputSchema).max(30).default([]),
});
export const categoryInputSchema = z.object({
  name: text(100).min(2),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/).max(100).optional(),
  description: optText(1000),
  parentId: idSchema.nullable().optional(),
  image: z.object({ publicId: text(300), url: z.string().url().max(500) }).nullable().optional(),
  displayOrder: z.number().int().min(0).max(10_000).default(0),
  isActive: z.boolean().default(true),
});

/* ---------- cart / checkout ---------- */
export const cartLineSchema = z.object({ variantId: idSchema, quantity: z.number().int().min(1).max(10_000) });
export const cartPriceSchema = z.object({
  items: z.array(cartLineSchema).max(100),
  couponCode: z.string().trim().max(40).optional(),
  shippingMethodId: idSchema.optional(),
});
export const checkoutSchema = z.object({
  items: z.array(cartLineSchema).min(1).max(100),
  shippingAddressId: idSchema,
  billingAddressId: idSchema.optional(),
  shippingMethodId: idSchema,
  couponCode: z.string().trim().max(40).optional(),
  notes: optText(500),
  idempotencyKey: z.string().trim().min(16).max(80),
});
export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(5).max(64),
  razorpay_payment_id: z.string().min(5).max(64),
  razorpay_signature: z.string().min(20).max(256),
});

/* ---------- admin ---------- */
export const orderStatusSchema = z.object({ status: z.enum(ORDER_STATUSES), note: optText(500) });
export const trackingSchema = z.object({ carrier: optText(80), trackingNumber: optText(80), url: z.string().url().max(500).optional().or(z.literal('').transform(() => undefined)) });
export const refundSchema = z.object({ amountPaise: z.number().int().min(100), reason: optText(300) });
export const stockAdjustSchema = z.object({ variantId: idSchema, delta: z.number().int().min(-1_000_000).max(1_000_000).refine((n) => n !== 0, 'Delta cannot be zero'), reason: text(200).min(3) });
export const couponInputSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, 'Code: 3-30 letters/numbers'),
  description: optText(200),
  type: z.enum(['fixed', 'percentage']),
  value: z.number().int().min(1),
  minOrderPaise: z.number().int().min(0).default(0),
  maxDiscountPaise: z.number().int().min(0).nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  perCustomerLimit: z.number().int().min(1).nullable().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  productIds: z.array(idSchema).default([]),
  categoryIds: z.array(idSchema).default([]),
  isActive: z.boolean().default(true),
}).refine((c) => c.type !== 'percentage' || c.value <= 100, { message: 'Percentage cannot exceed 100', path: ['value'] });
export const reviewInputSchema = z.object({ rating: z.number().int().min(1).max(5), title: optText(100), body: text(2000).min(5) });
export const bannerInputSchema = z.object({
  placement: z.enum(['hero', 'promo', 'announcement']),
  title: optText(120), subtitle: optText(300), ctaLabel: optText(40), ctaUrl: optText(300),
  image: z.object({ publicId: text(300), url: z.string().url().max(500) }).nullable().optional(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export const pageInputSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/).max(80),
  title: text(150).min(2),
  kind: z.enum(['policy', 'static', 'faq', 'section']).default('static'),
  content: z.string().max(50_000).default(''),
  faqs: z.array(z.object({ question: text(300).min(1), answer: text(3000).min(1) })).max(100).default([]),
  isPublished: z.boolean().default(true),
  seo: z.object({ title: optText(70), description: optText(170) }).optional(),
});
export const shippingInputSchema = z.object({
  name: text(80).min(2), description: optText(200), pricePaise: z.number().int().min(0),
  freeAbovePaise: z.number().int().min(0).nullable().optional(), estimatedDays: optText(40),
  isActive: z.boolean().default(true), displayOrder: z.number().int().min(0).default(0),
});
export const taxInputSchema = z.object({ name: text(60).min(2), ratePercent: z.number().min(0).max(100), isActive: z.boolean().default(true), appliesToShipping: z.boolean().default(false) });
export const settingsSchema = z.object({
  storeName: text(100).optional(), tagline: optText(150), contactEmail: z.string().email().optional(), contactPhone: optText(30),
  address: optText(300), whatsapp: optText(30), currency: z.literal('INR').optional(),
  social: z.object({ instagram: optText(200), facebook: optText(200), linkedin: optText(200), youtube: optText(200) }).optional(),
  seo: z.object({ title: optText(70), description: optText(170) }).optional(),
  announcement: optText(200),
  maintenanceMode: z.boolean().optional(),
  notifications: z.object({ orderEmails: z.boolean().optional(), lowStockAlerts: z.boolean().optional() }).optional(),
  featureFlags: z.record(z.string().max(40), z.boolean()).optional(),
  brandStory: optText(3000),
  hero: z.object({ eyebrow: optText(80), heading: optText(160), subheading: optText(300), ctaLabel: optText(40), ctaUrl: optText(200) }).optional(),
});
export const adminUserSchema = z.object({
  name: text(100).min(2), email: emailSchema, phone: phoneSchema.optional(),
  password: passwordSchema.optional(), roleKey: z.string().regex(/^[a-z_]{3,40}$/), extraPermissions: z.array(z.string().max(60)).max(50).default([]),
  status: z.enum(['active', 'deactivated']).default('active'),
});
export const adminUserUpdateSchema = adminUserSchema.partial().omit({ email: true });
export const roleInputSchema = z.object({ key: z.string().regex(/^[a-z_]{3,40}$/), name: text(60).min(2), description: optText(200), permissions: z.array(z.string().max(60)).max(60) });
export const enquirySchema = z.object({ name: text(100).min(2), email: emailSchema, phone: phoneSchema.optional(), message: text(2000).min(5), productName: optText(200) });
export const newsletterSchema = z.object({ email: emailSchema });
export const dateRangeSchema = z.object({
  range: z.enum(['today', 'yesterday', '7d', '30d', 'month', 'custom']).default('30d'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
