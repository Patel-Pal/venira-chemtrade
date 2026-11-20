/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Integration tests against a real (in-memory) MongoDB through the real repositories and services.
 * Razorpay network calls are mocked; signature/idempotency/inventory logic is the real code.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createHmac } from 'crypto';

vi.mock('@/services/razorpay', async (orig) => {
  const real = await orig<typeof import('@/services/razorpay')>();
  let n = 0;
  return {
    ...real,
    createRazorpayOrder: vi.fn(async (amount: number) => ({ id: `order_TEST${++n}`, amount, currency: 'INR' })),
    fetchRazorpayPayment: vi.fn(),
    createRazorpayRefund: vi.fn(async () => ({ id: 'rfnd_TEST1', status: 'processed' })),
  };
});

let mongod: MongoMemoryServer;
const KEY_SECRET = 'rzp_test_secret_value_123';
let mods: {
  repos: Awaited<ReturnType<typeof import('@/database/repositories').getRepos>>;
  auth: typeof import('@/modules/auth/auth.service');
  catalog: typeof import('@/modules/products/catalog.service');
  admin: typeof import('@/modules/products/product-admin.service');
  cart: typeof import('@/modules/orders/cart.service');
  checkout: typeof import('@/modules/orders/checkout.service');
  pay: typeof import('@/modules/payments/payment.service');
  orders: typeof import('@/modules/orders/order.service');
  users: typeof import('@/modules/users/admin-users.service');
  models: typeof import('@/database/models');
  perms: typeof import('@/constants/permissions');
  rz: typeof import('@/services/razorpay');
};
const ctx: Record<string, any> = {};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  Object.assign(process.env, {
    MONGODB_URI: mongod.getUri('vc_test'), AUTH_SECRET: 'x'.repeat(48), NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    RAZORPAY_KEY_ID: 'rzp_test_key', RAZORPAY_KEY_SECRET: KEY_SECRET, RAZORPAY_WEBHOOK_SECRET: 'whsec_test', CHECKOUT_RESERVATION_MINUTES: '20',
  });
  const { getRepos } = await import('@/database/repositories');
  mods = {
    repos: await getRepos(),
    auth: await import('@/modules/auth/auth.service'),
    catalog: await import('@/modules/products/catalog.service'),
    admin: await import('@/modules/products/product-admin.service'),
    cart: await import('@/modules/orders/cart.service'),
    checkout: await import('@/modules/orders/checkout.service'),
    pay: await import('@/modules/payments/payment.service'),
    orders: await import('@/modules/orders/order.service'),
    users: await import('@/modules/users/admin-users.service'),
    models: await import('@/database/models'),
    perms: await import('@/constants/permissions'),
    rz: await import('@/services/razorpay'),
  };
  const { repos, perms } = mods;
  for (const r of perms.DEFAULT_ROLES) await repos.roles.upsertByKey({ key: r.key, name: r.name, description: r.description, isSystem: r.isSystem, permissions: r.permissions });
  ctx.cat = await repos.categories.create({ name: 'Actives', slug: 'actives', parentId: null, displayOrder: 0, isActive: true });
  await repos.shipping.create({ name: 'Standard', pricePaise: 5_000, freeAbovePaise: null, isActive: true, displayOrder: 0 });
  await repos.shipping.createTax({ name: 'GST', ratePercent: 18, isActive: true, appliesToShipping: false });
  await repos.coupons.create({ code: 'SAVE10', type: 'percentage', value: 10, minOrderPaise: 0, maxDiscountPaise: null, usageLimit: null, perCustomerLimit: 1, startsAt: null, expiresAt: null, productIds: [], categoryIds: [], isActive: true });
}, 300_000);

afterAll(async () => {
  const mongoose = (await import('mongoose')).default;
  await mongoose.disconnect();
  await mongod?.stop();
});

const hmac = (s: string, d: string) => createHmac('sha256', s).update(d).digest('hex');
const actor = { userId: '000000000000000000000001' };

describe('catalogue', () => {
  it('creates products with variants, auto SKUs, and opening stock', async () => {
    const p1 = await mods.admin.createProduct({ name: 'Niacinamide', categoryId: ctx.cat.id, status: 'published', dataStatus: 'verified', benefits: [], ingredients: [], specifications: [], tags: [], isFeatured: false, isBestSeller: false, isNewArrival: false, seo: {}, variants: [{ label: '1 kg', pricePaise: 100_000, trackInventory: true, isActive: true, displayOrder: 0, initialStock: 10 }] } as any, actor);
    const p2 = await mods.admin.createProduct({ name: 'Kojic Acid', categoryId: ctx.cat.id, status: 'published', dataStatus: 'verified', benefits: [], ingredients: [], specifications: [], tags: [], isFeatured: false, isBestSeller: false, isNewArrival: false, seo: {}, variants: [{ label: '500 g', pricePaise: 50_000, trackInventory: true, isActive: true, displayOrder: 0, initialStock: 2 }] } as any, actor);
    const p3 = await mods.admin.createProduct({ name: 'Quote Only Gum', categoryId: ctx.cat.id, status: 'published', dataStatus: 'pending_admin_input', benefits: [], ingredients: [], specifications: [], tags: [], isFeatured: false, isBestSeller: false, isNewArrival: false, seo: {}, variants: [{ label: 'Standard', pricePaise: null, trackInventory: false, isActive: true, displayOrder: 0 }] } as any, actor);
    ctx.p1 = p1; ctx.p2 = p2; ctx.p3 = p3;
    const vs = await mods.repos.products.listVariants([p1.id, p2.id, p3.id]);
    ctx.v1 = vs.find((v) => v.productId === p1.id)!; ctx.v2 = vs.find((v) => v.productId === p2.id)!; ctx.v3 = vs.find((v) => v.productId === p3.id)!;
    expect(ctx.v1.sku).toMatch(/^VC-NIACI-1KG-\d{3}$/);
    const inv = await mods.repos.inventory.getByVariantIds([ctx.v1.id]);
    expect(inv[0].quantityOnHand).toBe(10);
  });
  it('lists, searches by name/SKU, sorts by price (unpriced last) and filters price', async () => {
    const all = await mods.catalog.listPublicProducts({ page: 1, limit: 20 });
    expect(all.total).toBe(3);
    expect((await mods.catalog.listPublicProducts({ page: 1, limit: 20, q: 'kojic' })).items.map((i) => i.name)).toEqual(['Kojic Acid']);
    expect((await mods.catalog.listPublicProducts({ page: 1, limit: 20, q: ctx.v1.sku.slice(0, 10) })).items.map((i) => i.name)).toContain('Niacinamide');
    const asc = await mods.catalog.listPublicProducts({ page: 1, limit: 20, sort: 'price_asc' });
    expect(asc.items.map((i) => i.name)).toEqual(['Kojic Acid', 'Niacinamide', 'Quote Only Gum']);
    const filtered = await mods.catalog.listPublicProducts({ page: 1, limit: 20, minPrice: 600, maxPrice: 1200 });
    expect(filtered.items.map((i) => i.name)).toEqual(['Niacinamide']);
    expect(asc.items[2].priceOnRequest).toBe(true);
  });
  it('does not expose draft/archived products publicly', async () => {
    await mods.repos.products.update(ctx.p3.id, { status: 'draft' });
    expect(await mods.catalog.getProductDetail(ctx.p3.slug)).toBeNull();
    await mods.repos.products.update(ctx.p3.id, { status: 'published' });
  });
});

describe('authentication', () => {
  it('registers, rejects wrong passwords, locks after repeated failures, and does not leak existence', async () => {
    const r = await mods.auth.registerCustomer({ name: 'Test Buyer', email: 'buyer@example.com', phone: '+919999999999', password: 'Password123' });
    expect(r.autoVerified).toBe(true);
    await mods.auth.registerCustomer({ name: 'Dup', email: 'buyer@example.com', password: 'Password123' }); // silent no-op
    const u = await mods.auth.authenticate('buyer@example.com', 'Password123');
    expect(u).not.toHaveProperty('passwordHash');
    ctx.user = u;
    for (let i = 0; i < 5; i++) await expect(mods.auth.authenticate('buyer@example.com', 'wrong')).rejects.toThrow('Invalid email or password');
    await expect(mods.auth.authenticate('buyer@example.com', 'Password123')).rejects.toThrow('Invalid email or password'); // locked
    await mods.repos.users.recordLoginSuccess(u.id); // clear lock for later tests
    await expect(mods.auth.authenticate('nobody@example.com', 'x')).rejects.toThrow('Invalid email or password');
  });
  it('password reset tokens are single-use and revoke sessions', async () => {
    await mods.repos.sessions.create({ userId: ctx.user.id, tokenHash: 'h1', expiresAt: new Date(Date.now() + 1e6) });
    await mods.repos.users.setResetToken(ctx.user.id, 'hash-of-token', new Date(Date.now() + 1e6));
    const sha = (await import('@/lib/security')).sha256;
    await mods.repos.users.setResetToken(ctx.user.id, sha('tok123456789012345678'), new Date(Date.now() + 1e6));
    await mods.auth.resetPassword('tok123456789012345678', 'NewPassword456');
    await expect(mods.auth.resetPassword('tok123456789012345678', 'Another789xx')).rejects.toThrow();
    expect(await mods.repos.sessions.findActiveByTokenHash('h1')).toBeNull();
    await expect(mods.auth.authenticate('buyer@example.com', 'NewPassword456')).resolves.toBeTruthy();
  });
});

describe('cart, checkout, inventory and payments', () => {
  it('prices the cart on the server with coupon, tax and stock validation', async () => {
    const c = await mods.cart.priceCart({ items: [{ variantId: ctx.v1.id, quantity: 2 }], couponCode: 'SAVE10', userId: ctx.user.id });
    expect(c.totals.subtotalPaise).toBe(200_000);
    expect(c.totals.discountPaise).toBe(20_000);
    expect(c.totals.shippingPaise).toBe(5_000);
    expect(c.totals.taxPaise).toBe(32_400); // 18% of 180000
    expect(c.totals.totalPaise).toBe(180_000 + 5_000 + 32_400);
    const over = await mods.cart.priceCart({ items: [{ variantId: ctx.v2.id, quantity: 5 }] });
    expect(over.lines[0].issue).toBe('insufficient_stock');
    const quote = await mods.cart.priceCart({ items: [{ variantId: ctx.v3.id, quantity: 1 }] });
    expect(quote.lines[0].issue).toBe('price_on_request');
    const bad = await mods.cart.priceCart({ items: [{ variantId: ctx.v1.id, quantity: 1 }], couponCode: 'NOPE' });
    expect(bad.couponError).toBeTruthy();
  });

  it('creates a pending order, reserves stock and is idempotent per key', async () => {
    const addr = await mods.repos.addresses.create({ userId: ctx.user.id, fullName: 'Test Buyer', phone: '+919999999999', line1: '1 Test Street', city: 'Surat', state: 'Gujarat', postalCode: '394210', country: 'IN', isDefaultShipping: true, isDefaultBilling: true });
    const ship = (await mods.repos.shipping.list())[0];
    ctx.addr = addr; ctx.ship = ship;
    const input = { userId: ctx.user.id, items: [{ variantId: ctx.v1.id, quantity: 2 }], shippingAddressId: addr.id, shippingMethodId: ship.id, couponCode: 'SAVE10', idempotencyKey: 'idem-key-0000000001' };
    const a = await mods.checkout.createCheckout(input);
    const b = await mods.checkout.createCheckout(input); // double click
    expect(b.orderId).toBe(a.orderId);
    expect(a.amountPaise).toBe(217_400);
    const order = await mods.repos.orders.findById(a.orderId);
    expect(order!.status).toBe('payment_pending');
    expect(order!.totalPaise).toBe(217_400);
    const inv = (await mods.repos.inventory.getByVariantIds([ctx.v1.id]))[0];
    expect(inv.quantityReserved).toBe(2);
    expect(inv.quantityOnHand).toBe(10);
    const items = await mods.repos.orders.items(a.orderId);
    expect(items[0]).toMatchObject({ productName: 'Niacinamide', unitPricePaise: 100_000, quantity: 2 }); // immutable snapshot
    ctx.co = a;
  });

  it('blocks overselling', async () => {
    await expect(mods.checkout.createCheckout({ userId: ctx.user.id, items: [{ variantId: ctx.v2.id, quantity: 3 }], shippingAddressId: ctx.addr.id, shippingMethodId: ctx.ship.id, idempotencyKey: 'idem-key-0000000002' })).rejects.toMatchObject({ code: 'CART_INVALID' });
  });

  it("refuses another customer's order and invalid browser signature", async () => {
    const other = await mods.repos.users.create({ email: 'other@example.com', name: 'Other', roleId: ctx.user.roleId, roleKey: 'customer', extraPermissions: [], status: 'active', emailVerified: true, authProviders: [] });
    expect(await mods.repos.orders.findByIdForUser(ctx.co.orderId, other.id)).toBeNull();
    await expect(mods.pay.verifyAndConfirm(other.id, { razorpay_order_id: ctx.co.razorpayOrderId, razorpay_payment_id: 'pay_X123456', razorpay_signature: 'a'.repeat(64) })).rejects.toThrow('Payment not found');
    await expect(mods.pay.verifyAndConfirm(ctx.user.id, { razorpay_order_id: ctx.co.razorpayOrderId, razorpay_payment_id: 'pay_X123456', razorpay_signature: 'a'.repeat(64) })).rejects.toMatchObject({ code: 'SIGNATURE_INVALID' });
    expect((await mods.repos.orders.findById(ctx.co.orderId))!.status).toBe('payment_pending');
  });

  it('rejects amount mismatch and never confirms the order', async () => {
    const r = await mods.pay.confirmPayment({ providerOrderId: ctx.co.razorpayOrderId, providerPaymentId: 'pay_FAKE1234', amountPaise: 100, currency: 'INR', source: 'webhook' });
    expect(r.outcome).toBe('amount_mismatch');
    expect((await mods.repos.orders.findById(ctx.co.orderId))!.paymentStatus).toBe('unpaid');
  });

  it('confirms payment once (verify + webhook race), commits inventory, records coupon usage', async () => {
    const payId = 'pay_REAL12345';
    const sig = hmac(KEY_SECRET, `${ctx.co.razorpayOrderId}|${payId}`);
    (mods.rz.fetchRazorpayPayment as any).mockResolvedValue({ id: payId, orderId: ctx.co.razorpayOrderId, amount: ctx.co.amountPaise, currency: 'INR', status: 'captured', method: 'upi' });
    const [v, w] = await Promise.all([
      mods.pay.verifyAndConfirm(ctx.user.id, { razorpay_order_id: ctx.co.razorpayOrderId, razorpay_payment_id: payId, razorpay_signature: sig }),
      mods.pay.handleWebhookEvent('evt_1', { event: 'payment.captured', payload: { payment: { entity: { id: payId, order_id: ctx.co.razorpayOrderId, amount: ctx.co.amountPaise, currency: 'INR', method: 'upi', status: 'captured' } } } }),
    ]);
    expect(v.status).toBe('paid');
    expect(['confirmed', 'already_confirmed']).toContain(w);
    // duplicate webhook delivery is ignored
    expect(await mods.pay.handleWebhookEvent('evt_1', { event: 'payment.captured', payload: { payment: { entity: { id: payId, order_id: ctx.co.razorpayOrderId, amount: ctx.co.amountPaise, currency: 'INR', status: 'captured' } } } })).toBe('duplicate');
    const order = await mods.repos.orders.findById(ctx.co.orderId);
    expect(order).toMatchObject({ status: 'confirmed', paymentStatus: 'paid' });
    const inv = (await mods.repos.inventory.getByVariantIds([ctx.v1.id]))[0];
    expect(inv.quantityOnHand).toBe(8); // committed exactly once
    expect(inv.quantityReserved).toBe(0);
    expect((await mods.repos.coupons.findByCode('SAVE10'))!.usedCount).toBe(1);
    const payment = await mods.repos.payments.findByProviderOrderId(ctx.co.razorpayOrderId);
    expect(payment).toMatchObject({ status: 'captured', providerPaymentId: payId, signatureVerified: true });
    // per-customer coupon limit now blocks reuse
    const again = await mods.cart.priceCart({ items: [{ variantId: ctx.v1.id, quantity: 1 }], couponCode: 'SAVE10', userId: ctx.user.id });
    expect(again.couponError).toMatch(/already used/);
  });

  it('refunds through the gateway and tracks refunded amounts', async () => {
    const r = await mods.pay.refundOrder(ctx.co.orderId, 50_000, 'goodwill', actor);
    expect(r.full).toBe(false);
    expect((await mods.repos.orders.findById(ctx.co.orderId))!.paymentStatus).toBe('partially_refunded');
    await expect(mods.pay.refundOrder(ctx.co.orderId, 9_999_999, 'too much', actor)).rejects.toThrow(/Maximum refundable/);
  });

  it('admin cannot bypass payment; legal transitions work; cancel restocks', async () => {
    const co2 = await mods.checkout.createCheckout({ userId: ctx.user.id, items: [{ variantId: ctx.v2.id, quantity: 1 }], shippingAddressId: ctx.addr.id, shippingMethodId: ctx.ship.id, idempotencyKey: 'idem-key-0000000003' });
    await expect(mods.orders.updateOrderStatus(co2.orderId, 'confirmed', 'manual', actor)).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
    expect((await mods.repos.inventory.getByVariantIds([ctx.v2.id]))[0].quantityReserved).toBe(1);
    await mods.orders.updateOrderStatus(co2.orderId, 'cancelled', 'test', actor); // unpaid -> releases reservation
    expect((await mods.repos.inventory.getByVariantIds([ctx.v2.id]))[0].quantityReserved).toBe(0);
    await mods.orders.updateOrderStatus(ctx.co.orderId, 'processing', undefined, actor);
    await expect(mods.orders.updateOrderStatus(ctx.co.orderId, 'delivered', undefined, actor)).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  it('releases expired reservations and still honours a late payment', async () => {
    const co3 = await mods.checkout.createCheckout({ userId: ctx.user.id, items: [{ variantId: ctx.v2.id, quantity: 2 }], shippingAddressId: ctx.addr.id, shippingMethodId: ctx.ship.id, idempotencyKey: 'idem-key-0000000004' });
    expect((await mods.repos.inventory.getByVariantIds([ctx.v2.id]))[0].quantityReserved).toBe(2);
    await mods.models.OrderModel.updateOne({ _id: co3.orderId }, { $set: { reservedUntil: new Date(Date.now() - 1000) } });
    expect(await mods.checkout.releaseExpiredReservations()).toBeGreaterThanOrEqual(1);
    expect((await mods.repos.inventory.getByVariantIds([ctx.v2.id]))[0].quantityReserved).toBe(0);
    expect((await mods.repos.orders.findById(co3.orderId))!.status).toBe('cancelled');
    // delayed webhook arrives after expiry -> order confirmed, stock re-reserved and committed
    const r = await mods.pay.confirmPayment({ providerOrderId: co3.razorpayOrderId, providerPaymentId: 'pay_LATE12345', amountPaise: co3.amountPaise, currency: 'INR', source: 'webhook' });
    expect(r.outcome).toBe('confirmed');
    const inv = (await mods.repos.inventory.getByVariantIds([ctx.v2.id]))[0];
    expect(inv.quantityOnHand).toBe(0);
    expect(inv.quantityReserved).toBe(0);
  });
});

describe('RBAC and audit', () => {
  const fakeAuth = (roleKey: string, perms: string[], isSuper = false): any => ({ user: { id: '0'.repeat(24), roleKey }, permissions: new Set(perms), isSuperAdmin: isSuper, isStaff: true });
  it('prevents privilege escalation when creating staff and roles', async () => {
    const limited = fakeAuth('admin', ['admins.manage', 'roles.manage', 'products.read']);
    await expect(mods.users.createStaff(limited, { name: 'Evil', email: 'evil@example.com', password: 'Password123', roleKey: 'super_admin', extraPermissions: [], status: 'active' })).rejects.toMatchObject({ status: 403 });
    await expect(mods.users.createStaff(limited, { name: 'Evil', email: 'evil2@example.com', password: 'Password123', roleKey: 'product_manager', extraPermissions: ['settings.manage'], status: 'active' })).rejects.toMatchObject({ status: 403 });
    await expect(mods.users.createRole(limited, { key: 'custom_x', name: 'X', permissions: ['system.manage'] })).rejects.toMatchObject({ status: 403 });
    await expect(mods.users.createStaff(fakeAuth('order_manager', ['orders.read']), { name: 'N', email: 'n@example.com', roleKey: 'admin', extraPermissions: [], status: 'active' } as any)).rejects.toMatchObject({ status: 403 });
  });
  it('super admin can create staff; staff cannot edit their own role', async () => {
    const sa = fakeAuth('super_admin', [], true);
    sa.permissions = new Set(mods.perms.ALL_PERMISSIONS);
    const s = await mods.users.createStaff(sa, { name: 'Prod Mgr', email: 'pm@example.com', password: 'Password123', roleKey: 'product_manager', extraPermissions: [], status: 'active' }) as any;
    expect(s).not.toHaveProperty('passwordHash');
    await expect(mods.users.updateStaff({ ...sa, isSuperAdmin: false, permissions: new Set(['admins.manage']), user: { ...sa.user, id: s.id } }, s.id, { roleKey: 'admin' })).rejects.toMatchObject({ status: 403 });
  });
  it('audit log is append-only', async () => {
    await mods.repos.audit.append({ action: 'test.event', resourceType: 'test' });
    await expect(mods.models.AuditModel.updateOne({}, { $set: { action: 'tampered' } }).exec()).rejects.toThrow('append-only');
    await expect(mods.models.AuditModel.deleteMany({}).exec()).rejects.toThrow('append-only');
    const logs = await mods.repos.audit.list({ page: 1, limit: 50 });
    expect(logs.items.some((l) => l.action === 'auth.login.failed')).toBe(true);
    expect(JSON.stringify(logs.items)).not.toMatch(/Password123|passwordHash/);
  });
});
