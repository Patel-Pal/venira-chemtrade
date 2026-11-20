# Database Architecture

MongoDB Atlas via Mongoose today, designed so a MySQL migration needs **no change to business services**.

## 1. Design rules (as implemented)

| Rule | Implementation |
|---|---|
| Unique id on every entity | Mongo `ObjectId` (`_id`). Domain code only sees opaque **string ids** (`ID` in `src/types/domain.ts`). |
| Consistent id type | All references are `ObjectId` refs (24-hex strings in the domain). |
| References, not deep nesting | Variants, images, inventory, cart items, wishlist items, order items, refunds, coupon usages are **separate collections** referencing parents. |
| No large histories embedded | Orders live in `orders`/`order_items`; users hold no order arrays. |
| No product copies in orders | `order_items` stores an **immutable snapshot** (name, SKU, variant label, unit price, qty, image) - never joins live product rows for history. |
| Timestamps | `createdAt`/`updatedAt` on all (Mongoose `timestamps`), stored as UTC `Date`. Business-day grouping uses `Asia/Kolkata` only at query time. |
| Explicit enums | Order/payment/product/user/review/refund status are enumerated in schema + `src/types/domain.ts`. |
| Money | **Integer paise** (`*Paise` fields). No floats. `percentOf()` rounds half-up to paise. |
| No Mongo operators in services | All queries live in `src/database/repositories/mongo/*`. Services depend on `src/database/repositories/interfaces.ts`. |
| SQL-ready relations | Every ref maps to an FK (see section 4). |

## 2. Repository layer

```
services/modules ──► Repositories (interfaces.ts) ◄── MongoXRepository (mongo/*.ts)
                                   ▲
                                   └── (future) MysqlXRepository implements the same interfaces
```
Interfaces: `IUserRepository, ISessionRepository, IRoleRepository, IAddressRepository, ICategoryRepository, IProductRepository, IInventoryRepository, IOrderRepository, IPaymentRepository, ICouponRepository, IReviewRepository, IShippingRepository, ISettingsRepository, IAuditRepository, IUserDataRepository, ICrudRepository`.
Composition root: `getRepos()` in `src/database/repositories/index.ts`. A MySQL driver is added by returning a different `Repositories` object (e.g. switch on `DATABASE_DRIVER`). No fake MySQL code exists today.

Atomicity-sensitive operations are expressed as **repository methods** (not leaked operators): `inventory.reserve/release/commit` (idempotent via a unique transaction row), `orders.transitionIf` (compare-and-set), `payments.recordEvent` (unique event id), `coupons.recordUsage` (unique per order). In MySQL these map to `INSERT ... UNIQUE`, `UPDATE ... WHERE status IN (...)` and transactions.

## 3. MongoDB collections

All 30 required collections exist (`src/database/models/index.ts`) plus `payment_events` (webhook idempotency; MySQL table `payment_events`).

| # | Collection | Key fields | Indexes / constraints |
|---|---|---|---|
| 1 | users | email, name, phone, passwordHash (select:false), roleId, roleKey, extraPermissions[], status, emailVerified, authProviders[], lastLoginAt, failedLoginCount, lockedUntil, token hashes | unique email; roleId; roleKey; status; text(name,email) |
| 2 | roles | key, name, description, isSystem, permissions[] | unique key |
| 3 | permissions | key, description, module | unique key |
| 4 | user_addresses | userId, fullName, phone, line1/2, city, state, postalCode, country, gstin, isDefaultShipping/Billing | userId |
| 5 | categories | name, slug, description, parentId, image{publicId,url}, displayOrder, isActive | unique slug; parentId; isActive |
| 6 | products | name, slug, categoryId, descriptions, benefits[], ingredients[], howToUse, specifications[], tags[], status, flags, seo, sourceName, dataStatus, rating*, salesCount | unique slug; categoryId; status; flags; text; (status, createdAt) |
| 7 | product_variants | productId, sku, label, pricePaise (null = on request), compareAtPricePaise, trackInventory, isActive, displayOrder | unique sku; productId |
| 8 | product_images | productId, publicId, url, format, width, height, alt, displayOrder | (productId, displayOrder); publicId |
| 9 | inventory | variantId, quantityOnHand, quantityReserved, lowStockThreshold | unique variantId |
| 10 | inventory_transactions | variantId, type, quantityDelta, reference, reason, actorId | variantId; reference; createdAt; **partial unique (variantId,type,reference)** for reservation/release/commit |
| 11 | carts | userId | unique userId |
| 12 | cart_items | cartId, variantId, quantity | unique (cartId, variantId) |
| 13 | wishlists | userId | unique userId |
| 14 | wishlist_items | wishlistId, productId | unique (wishlistId, productId) |
| 15 | orders | orderNumber, userId, status, paymentStatus, money fields, couponId/Code, shippingAddress/billingAddress **snapshots**, shippingMethod snapshot, tracking, statusHistory[], reservedUntil, idempotencyKey | unique orderNumber; userId; status; paymentStatus; reservedUntil; **partial unique (userId, idempotencyKey)** |
| 16 | order_items | orderId, productId, variantId, productName, sku, variantLabel, imageUrl, unitPricePaise, quantity, lineTotalPaise | orderId (never updated) |
| 17 | payments | orderId, provider, providerOrderId, providerPaymentId, status, amountPaise, currency, method, signatureVerified, verifiedAt, refundedPaise | unique providerOrderId; **partial unique providerPaymentId**; orderId; status |
| 18 | payment_refunds | paymentId, orderId, providerRefundId, amountPaise, status, reason, actorId | paymentId; orderId; partial unique providerRefundId |
| 19 | coupons | code, type, value, minOrderPaise, maxDiscountPaise, usageLimit, perCustomerLimit, usedCount, startsAt, expiresAt, productIds[], categoryIds[], isActive | unique code |
| 20 | coupon_usages | couponId, userId, orderId, discountPaise | unique orderId; (couponId,userId) |
| 21 | product_reviews | productId, userId, userName, rating, title, body, status, verifiedPurchase | unique (productId,userId); status |
| 22 | banners | placement, title, subtitle, cta*, image, displayOrder, isActive, startsAt/endsAt | placement |
| 23 | pages | slug, title, kind, content, faqs[], isPublished, seo | unique slug |
| 24 | notifications | type, audience, userId, title, body, data, readAt | type; createdAt |
| 25 | newsletter_subscribers | email, isActive | unique email |
| 26 | shipping_methods | name, pricePaise, freeAbovePaise, estimatedDays, isActive, displayOrder | - |
| 27 | tax_configurations | name, ratePercent, isActive, appliesToShipping | - |
| 28 | store_settings | key, value (JSON), isSecret | unique key (secrets are NOT stored here; they live in env vars) |
| 29 | audit_logs | userId, action, resourceType, resourceId, ip, before, after, meta | userId; action; resourceType; createdAt; **append-only** (update/delete hooks throw) |
| 30 | sessions | userId, tokenHash (sha256 of JWT id), ip, userAgent, expiresAt, revokedAt | unique tokenHash; userId; TTL on expiresAt (+7d) |
| + | payment_events | eventId, type, providerPaymentId, providerOrderId, processedAt, outcome | unique eventId |

Embedded (intentionally) because they are value objects with no independent lifecycle: address/shipping-method **snapshots** on orders, `specifications[]`, `benefits[]`, `ingredients[]`, `tags[]`, `faqs[]`, `seo`, `image{publicId,url}` on categories/banners, `statusHistory[]`. Each has a normalised table in section 4.

## 4. Relationships

- users 1-N user_addresses, orders, product_reviews, sessions, audit_logs; users 1-1 carts, wishlists; users N-1 roles (Mongo: `roleId`; MySQL: `user_roles` allows many).
- roles N-M permissions (`role_permissions`); per-user `extraPermissions[]` -> `user_permissions`.
- categories 1-N categories (self, `parent_id`), categories 1-N products.
- products 1-N product_variants, product_images, product_reviews.
- product_variants 1-1 inventory, 1-N inventory_transactions.
- orders 1-N order_items, payments, payment_refunds, order_status_history; payments 1-N payment_refunds.
- coupons 1-N coupon_usages; coupons N-M products / categories (`coupon_products`, `coupon_categories`).

## 5. Proposed MySQL schema (InnoDB, utf8mb4, `DATETIME(3)` stored in UTC)

Conventions: PK `id BIGINT UNSIGNED AUTO_INCREMENT` (plus `legacy_mongo_id CHAR(24) UNIQUE NULL` during migration), money `BIGINT` paise, booleans `TINYINT(1)`, enums `ENUM(...)`, JSON `JSON`. `NN` = NOT NULL. Every table also has `created_at DATETIME(3) NN DEFAULT CURRENT_TIMESTAMP(3)` and (unless noted) `updated_at DATETIME(3) NN ON UPDATE CURRENT_TIMESTAMP(3)`.

### users
| Column | Type | Constraints |
|---|---|---|
| id | BIGINT UNSIGNED | PK |
| email | VARCHAR(254) | NN, **UNIQUE** |
| name | VARCHAR(100) | NN |
| phone | VARCHAR(20) | NULL |
| password_hash | VARCHAR(100) | NULL (OAuth users) |
| status | ENUM('pending','active','blocked','deactivated') | NN, INDEX |
| email_verified | TINYINT(1) | NN DEFAULT 0 |
| email_verify_token_hash, reset_token_hash | CHAR(64) | NULL, INDEX |
| email_verify_expires_at, reset_token_expires_at, last_login_at, locked_until | DATETIME(3) | NULL |
| failed_login_count | INT | NN DEFAULT 0 |
Indexes: `(status)`, `FULLTEXT(name,email)`. Role via `user_roles`.

### roles / permissions / role_permissions / user_roles / user_permissions
- `roles(id PK, role_key VARCHAR(40) UNIQUE NN, name VARCHAR(60) NN, description VARCHAR(200), is_system TINYINT(1))`
- `permissions(id PK, perm_key VARCHAR(60) UNIQUE NN, description VARCHAR(200), module VARCHAR(30))`
- `role_permissions(role_id FK roles ON DELETE CASCADE, permission_id FK permissions ON DELETE CASCADE, PK(role_id, permission_id))`
- `user_roles(user_id FK users ON DELETE CASCADE, role_id FK roles ON DELETE RESTRICT, PK(user_id, role_id))`
- `user_permissions(user_id FK users CASCADE, permission_id FK permissions CASCADE, PK(user_id, permission_id))` (from `extraPermissions[]`)

### user_addresses
`id PK`, `user_id FK users CASCADE NN INDEX`, `label VARCHAR(40)`, `full_name VARCHAR(100) NN`, `phone VARCHAR(20) NN`, `line1 VARCHAR(200) NN`, `line2 VARCHAR(200)`, `city VARCHAR(80) NN`, `state VARCHAR(80) NN`, `postal_code VARCHAR(10) NN`, `country CHAR(2) NN DEFAULT 'IN'`, `gstin VARCHAR(15)`, `is_default_shipping`, `is_default_billing` TINYINT(1).

### categories
`id PK`, `parent_id FK categories(id) ON DELETE RESTRICT NULL INDEX`, `name VARCHAR(100) NN`, `slug VARCHAR(100) NN UNIQUE`, `description TEXT`, `image_public_id VARCHAR(300)`, `image_url VARCHAR(500)`, `display_order INT NN`, `is_active TINYINT(1) NN INDEX`.

### products
`id PK`, `category_id FK categories RESTRICT NN INDEX`, `name VARCHAR(160) NN`, `slug VARCHAR(120) NN UNIQUE`, `short_description VARCHAR(300)`, `description MEDIUMTEXT`, `how_to_use TEXT`, `status ENUM('draft','published','archived') NN`, `is_featured/is_best_seller/is_new_arrival TINYINT(1)`, `seo_title VARCHAR(70)`, `seo_description VARCHAR(170)`, `source_name VARCHAR(200)`, `data_status ENUM('verified','pending_admin_input')`, `rating_average DECIMAL(3,2)`, `rating_count INT`, `sales_count INT`.
Indexes: `(status, created_at)`, `(is_featured)`, `(is_best_seller)`, `(sales_count)`, `FULLTEXT(name, short_description, description)`.
Child tables for embedded arrays: `product_benefits(id PK, product_id FK CASCADE, position INT, text VARCHAR(300))`, `product_ingredients(...text VARCHAR(200))`, `product_specifications(id, product_id FK CASCADE, position, label VARCHAR(80), value VARCHAR(300))`, `product_tags(product_id FK CASCADE, tag VARCHAR(40), PK(product_id, tag))`.

### product_variants
`id PK`, `product_id FK products CASCADE NN INDEX`, `sku VARCHAR(40) NN UNIQUE`, `label VARCHAR(60) NN`, `price_paise BIGINT NULL` (NULL = price on request), `compare_at_price_paise BIGINT NULL`, `track_inventory TINYINT(1)`, `is_active TINYINT(1)`, `display_order INT`.

### product_images
`id PK`, `product_id FK products CASCADE NN`, `public_id VARCHAR(300) NN INDEX`, `url VARCHAR(500) NN`, `format VARCHAR(10)`, `width INT`, `height INT`, `alt VARCHAR(160)`, `display_order INT NN`. Index `(product_id, display_order)`.

### inventory
`id PK`, `variant_id FK product_variants CASCADE NN UNIQUE`, `quantity_on_hand INT NN CHECK(>=0)`, `quantity_reserved INT NN CHECK(>=0)`, `low_stock_threshold INT NN DEFAULT 10`. CHECK `quantity_reserved <= quantity_on_hand`.

### inventory_transactions
`id PK`, `variant_id FK product_variants RESTRICT NN INDEX`, `type ENUM('initial','adjustment','reservation','release','commit','return') NN`, `quantity_delta INT NN`, `reference VARCHAR(80)`, `reason VARCHAR(200)`, `actor_id FK users SET NULL`, `created_at` only. UNIQUE `(variant_id, type, reference)` (for reservation/release/commit; MySQL treats NULL references as distinct so non-order rows are unaffected). INDEX `(created_at)`, `(reference)`.

### carts / cart_items / wishlists / wishlist_items
- `carts(id PK, user_id FK users CASCADE UNIQUE NN)`; `cart_items(id PK, cart_id FK carts CASCADE, variant_id FK product_variants CASCADE, quantity INT NN CHECK(>0), UNIQUE(cart_id, variant_id))`
- `wishlists(id PK, user_id FK users CASCADE UNIQUE NN)`; `wishlist_items(id PK, wishlist_id FK wishlists CASCADE, product_id FK products CASCADE, UNIQUE(wishlist_id, product_id))`

### orders
`id PK`, `order_number VARCHAR(30) NN UNIQUE`, `user_id FK users RESTRICT NN INDEX`, `customer_email VARCHAR(254) NN`, `customer_phone VARCHAR(20)`, `status ENUM('pending','payment_pending','confirmed','processing','packed','shipped','out_for_delivery','delivered','cancelled','returned','refunded') NN INDEX`, `payment_status ENUM('unpaid','paid','failed','refunded','partially_refunded') NN INDEX`, `currency CHAR(3) NN`, `subtotal_paise/discount_paise/shipping_paise/tax_paise/total_paise BIGINT NN`, `coupon_id FK coupons SET NULL`, `coupon_code VARCHAR(40)`, `shipping_method_id FK shipping_methods SET NULL`, `shipping_method_name VARCHAR(80)`, snapshot columns for both addresses (`ship_full_name, ship_phone, ship_line1, ship_line2, ship_city, ship_state, ship_postal_code, ship_country, ship_gstin` and `bill_*`), `tracking_carrier VARCHAR(80)`, `tracking_number VARCHAR(80)`, `tracking_url VARCHAR(500)`, `reserved_until DATETIME(3) INDEX`, `idempotency_key VARCHAR(80)`, `notes VARCHAR(500)`. UNIQUE `(user_id, idempotency_key)`. INDEX `(created_at)`.

### order_status_history
`id PK`, `order_id FK orders CASCADE NN INDEX`, `status ENUM(...same) NN`, `note VARCHAR(500)`, `actor_id FK users SET NULL`, `at DATETIME(3) NN`.

### order_items (immutable)
`id PK`, `order_id FK orders CASCADE NN INDEX`, `product_id FK products RESTRICT`, `variant_id FK product_variants RESTRICT`, `product_name VARCHAR(160) NN`, `sku VARCHAR(40) NN`, `variant_label VARCHAR(60) NN`, `image_url VARCHAR(500)`, `unit_price_paise BIGINT NN`, `quantity INT NN`, `line_total_paise BIGINT NN`. No `updated_at`. Triggers/permissions forbid UPDATE.

### payments
`id PK`, `order_id FK orders RESTRICT NN INDEX`, `provider VARCHAR(20) NN`, `provider_order_id VARCHAR(64) NN UNIQUE`, `provider_payment_id VARCHAR(64) NULL UNIQUE`, `status ENUM('created','authorized','captured','failed','refunded','partially_refunded') NN INDEX`, `amount_paise BIGINT NN`, `currency CHAR(3) NN`, `method VARCHAR(30)`, `signature_verified TINYINT(1) NN`, `verified_at DATETIME(3)`, `failure_reason VARCHAR(200)`, `refunded_paise BIGINT NN DEFAULT 0`.

### payment_events (webhook idempotency)
`id PK`, `event_id VARCHAR(64) NN UNIQUE`, `type VARCHAR(60) NN`, `provider_payment_id VARCHAR(64)`, `provider_order_id VARCHAR(64)`, `processed_at DATETIME(3)`, `outcome VARCHAR(40)`.

### payment_refunds
`id PK`, `payment_id FK payments RESTRICT NN INDEX`, `order_id FK orders RESTRICT NN INDEX`, `provider_refund_id VARCHAR(64) NULL UNIQUE`, `amount_paise BIGINT NN`, `status ENUM('pending','processed','failed') NN`, `reason VARCHAR(300)`, `actor_id FK users SET NULL`.

### coupons / coupon_usages / coupon_products / coupon_categories
- `coupons(id PK, code VARCHAR(30) NN UNIQUE, description VARCHAR(200), type ENUM('fixed','percentage') NN, value BIGINT NN, min_order_paise BIGINT NN, max_discount_paise BIGINT NULL, usage_limit INT NULL, per_customer_limit INT NULL, used_count INT NN, starts_at DATETIME(3) NULL, expires_at DATETIME(3) NULL, is_active TINYINT(1) NN)`
- `coupon_usages(id PK, coupon_id FK coupons CASCADE, user_id FK users CASCADE, order_id FK orders CASCADE UNIQUE, discount_paise BIGINT, INDEX(coupon_id,user_id))`
- `coupon_products(coupon_id FK, product_id FK, PK(both))`, `coupon_categories(coupon_id FK, category_id FK, PK(both))`

### product_reviews
`id PK`, `product_id FK products CASCADE NN INDEX`, `user_id FK users CASCADE NN`, `user_name VARCHAR(100)`, `rating TINYINT NN CHECK(1..5)`, `title VARCHAR(100)`, `body TEXT NN`, `status ENUM('pending','approved','rejected') NN INDEX`, `verified_purchase TINYINT(1)`. UNIQUE `(product_id, user_id)`.

### banners / pages / page_faqs
- `banners(id PK, placement ENUM('hero','promo','announcement') NN INDEX, title VARCHAR(120), subtitle VARCHAR(300), cta_label VARCHAR(40), cta_url VARCHAR(300), image_public_id VARCHAR(300), image_url VARCHAR(500), display_order INT, is_active TINYINT(1), starts_at, ends_at DATETIME(3))`
- `pages(id PK, slug VARCHAR(80) NN UNIQUE, title VARCHAR(150) NN, kind ENUM('policy','static','faq','section') NN, content MEDIUMTEXT, is_published TINYINT(1), seo_title VARCHAR(70), seo_description VARCHAR(170))`; `page_faqs(id PK, page_id FK pages CASCADE, position INT, question VARCHAR(300), answer TEXT)`

### notifications / newsletter_subscribers
- `notifications(id PK, type VARCHAR(40) NN INDEX, audience ENUM('admin','user') NN, user_id FK users CASCADE NULL, title VARCHAR(200), body TEXT, data JSON, read_at DATETIME(3), INDEX(created_at))`
- `newsletter_subscribers(id PK, email VARCHAR(254) NN UNIQUE, is_active TINYINT(1))`

### shipping_methods / tax_configurations / store_settings
- `shipping_methods(id PK, name VARCHAR(80) NN, description VARCHAR(200), price_paise BIGINT NN, free_above_paise BIGINT NULL, estimated_days VARCHAR(40), is_active TINYINT(1), display_order INT)`
- `tax_configurations(id PK, name VARCHAR(60) NN, rate_percent DECIMAL(5,2) NN, is_active TINYINT(1), applies_to_shipping TINYINT(1))`
- `store_settings(id PK, setting_key VARCHAR(80) NN UNIQUE, value JSON, is_secret TINYINT(1))`

### audit_logs (append-only)
`id PK`, `user_id FK users SET NULL INDEX`, `action VARCHAR(80) NN INDEX`, `resource_type VARCHAR(40) INDEX`, `resource_id VARCHAR(40)`, `ip VARCHAR(64)`, `before_json JSON`, `after_json JSON`, `meta_json JSON`, `created_at DATETIME(3) NN INDEX`. App DB user is granted INSERT/SELECT only on this table.

### sessions
`id PK`, `user_id FK users CASCADE NN INDEX`, `token_hash CHAR(64) NN UNIQUE`, `ip VARCHAR(64)`, `user_agent VARCHAR(250)`, `expires_at DATETIME(3) NN INDEX`, `revoked_at DATETIME(3) NULL`. A scheduled `DELETE ... WHERE expires_at < NOW() - INTERVAL 7 DAY` replaces Mongo's TTL index.

## 6. Mapping notes
- ObjectId -> `legacy_mongo_id CHAR(24)` during migration; FKs are resolved through a temporary `id_map(collection, mongo_id, sql_id)` table (see `MYSQL_MIGRATION_PLAN.md`).
- Null-able unique (`provider_payment_id`, `provider_refund_id`, `inventory_transactions.reference`): MySQL UNIQUE allows multiple NULLs, matching Mongo partial-unique indexes.
- Mongo `$text` -> MySQL `FULLTEXT`; regex "contains" search -> `LIKE '%term%'` / FULLTEXT.
- Aggregations in `IOrderRepository` (summary/revenueSeries/statusBreakdown/topProducts) become `GROUP BY` queries; time zone via `CONVERT_TZ(created_at,'+00:00','+05:30')`.
