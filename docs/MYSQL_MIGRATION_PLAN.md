# MongoDB -> MySQL Migration Plan

Status: **planned, not implemented.** No MySQL code exists in the app today (by design). See `DATABASE_ARCHITECTURE.md` for the target schema.

## 1. Preconditions
1. Create MySQL 8.0+ schema from `DATABASE_ARCHITECTURE.md` section 5 (add `legacy_mongo_id CHAR(24) UNIQUE` to every table that has a Mongo `_id`).
2. Implement `Mysql*Repository` classes for every interface in `src/database/repositories/interfaces.ts` (suggested: Prisma or Drizzle behind the repositories; no service changes).
3. Add `DATABASE_DRIVER=mongo|mysql` and select the factory in `getRepos()`.
4. Run the existing **integration suite** (`tests/integration`) against the MySQL repositories - the same assertions must pass (idempotent reserve/commit, unique webhook events, atomic order transitions).

## 2. ID mapping (ObjectId -> SQL id)
- Each SQL row gets an auto-increment `id`; the original ObjectId hex is stored in `legacy_mongo_id`.
- Migration keeps a table `id_map(collection VARCHAR(40), mongo_id CHAR(24), sql_id BIGINT, PRIMARY KEY(collection, mongo_id))`.
- Load order (parents before children) resolves every reference through `id_map`:
  `permissions, roles, role_permissions` -> `users, user_roles, user_permissions` -> `user_addresses` -> `categories` (two passes for `parent_id`) -> `products` (+benefits/ingredients/specs/tags) -> `product_variants, product_images` -> `inventory, inventory_transactions` -> `shipping_methods, tax_configurations, store_settings` -> `coupons (+products/categories)` -> `orders (+order_status_history)` -> `order_items` -> `payments, payment_events, payment_refunds` -> `coupon_usages` -> `carts/cart_items, wishlists/wishlist_items` -> `product_reviews` -> `banners, pages (+page_faqs), notifications, newsletter_subscribers` -> `sessions` (optional; can be dropped to force re-login) -> `audit_logs`.
- Public URLs never expose ids (slugs / order numbers), and the app treats ids as opaque strings, so changing id format does not affect clients. Stored `orders.id` in emails/links are re-issued after cut-over; old links resolve through `legacy_mongo_id` in a one-line redirect lookup for 90 days.

## 3. Referential integrity
- Migrate with `SET FOREIGN_KEY_CHECKS=1`; any orphan fails the load and is written to `migration_rejects.json`.
- Known intentional mapping decisions: embedded arrays -> child tables; address/shipping **snapshots** on orders -> flat `ship_*`/`bill_*` columns (never re-linked to `user_addresses`); `order_items` keep denormalised names/SKUs.
- Pre-flight query list (run on Mongo): orders without `userId`, order_items without order, payments without order, variants without product, duplicate SKUs/slugs/emails (case-insensitive). Fix before migrating.

## 4. Index conversion
| Mongo | MySQL |
|---|---|
| unique single-field | `UNIQUE KEY` |
| partial unique (`$type:'string'`) | `UNIQUE KEY` on nullable column (multiple NULLs allowed) |
| compound `(a,b)` | composite `KEY`/`UNIQUE KEY` |
| TTL `expiresAt` | scheduled `DELETE` (cron) |
| `$text` | `FULLTEXT` |
| unindexed regex search | `LIKE` / FULLTEXT; add `(name)` prefix index if needed |

## 5. Data export / import
1. Freeze schema changes. Take a Mongo snapshot (`mongodump --gzip`) and keep it for rollback.
2. Export each collection to NDJSON (`mongoexport --jsonFormat=canonical` or a Node script using the Mongoose models).
3. Transform script (`src/database/migrations/mongo-to-mysql/*.ts`, to be written): per collection map fields, convert `ObjectId`->`id_map`, `Date`->UTC `DATETIME(3)`, arrays->child rows, snapshots->columns, enums validated against the target enum list.
4. Bulk-insert in 1k-row batches inside transactions per collection; record counts.
5. Rebuild derived counters (`products.rating_*`, `coupons.used_count`, `products.sales_count`) from source rows and compare.

## 6. Validation after migration
- Row counts per table == Mongo `countDocuments` (exclude intentionally dropped `sessions`).
- Checksums: `SUM(total_paise)` of orders, `SUM(amount_paise)` of captured payments, `SUM(quantity_on_hand)` of inventory, per month - must equal Mongo aggregates **to the paisa**.
- Referential checks: zero orphans (`LEFT JOIN ... WHERE parent.id IS NULL`).
- Uniques: order numbers, SKUs, slugs, provider ids.
- Functional: run Playwright E2E + integration suite on a staging copy; reconcile 20 random orders end-to-end (items, totals, status history, payments).
- Razorpay reconciliation: compare captured payment ids with the Razorpay dashboard export for the migration window.

## 7. Downtime & synchronisation
Recommended: **short maintenance window** (store is B2B/low write volume).
1. Enable maintenance mode (Super Admin > System config) and pause the cron/webhook? **Do not** disable webhooks: Razorpay retries for 24h; leave them returning 503 during the window so they are retried afterwards (events are idempotent via `payment_events`).
2. Final dump -> transform -> load (estimated minutes for tens of thousands of rows).
3. Validate (section 6), flip `DATABASE_DRIVER=mysql`, deploy, disable maintenance.
For zero-downtime (if volumes grow): dual-write behind a `CompositeRepository` (write MySQL + Mongo, read Mongo) for a week, backfill history with the script, compare nightly with the validation queries, then switch reads.

## 8. Rollback strategy
- Keep Mongo read-write-capable and untouched for 14 days after cut-over; the pre-migration `mongodump` is the restore point.
- Before the flip, record the cut-over timestamp. If rollback is needed: set maintenance mode, export rows **created after the timestamp** from MySQL (orders, payments, refunds, users, reviews, inventory transactions), replay into Mongo through the same repository interfaces (script reuses `Mongo*Repository`), flip `DATABASE_DRIVER=mongo`.
- Payment facts always reconcile against Razorpay (source of truth) so no payment is lost either way.

## 9. Post-migration
Run `ANALYZE TABLE`, enable slow-query log, set up daily backups with PITR, remove Mongo-specific env vars after the 14-day soak, delete `Mongo*` code only after sign-off.
