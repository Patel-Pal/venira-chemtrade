# Project Overview - Venira Chemtrade Store

## Source material
- Logo: `public/images/logo-original.jpeg` (untouched). `logo-full.png` / `logo-mark.png` are whitespace-trimmed crops of the same pixels (no recolouring/redrawing). Brand colours were sampled from it: navy `#2B5290`, sky `#5DB1CF`, green `#8DC04C`, grey `#8E8E8E`.
- Catalogue: `source/venira-chemtrade-catalogue.pdf` - a **B2B cosmetic-ingredient list (names only)**. See `PDF_PRODUCT_EXTRACTION.md`.

## Decisions taken (change any of them in Admin or code)
1. The PDF contains no prices/descriptions/sizes, so all 142 entries are seeded as **published, "Info pending", price on request** with a *Request a quote* flow. Nothing was invented. Adding a price + stock to a variant instantly enables Add to cart / checkout.
2. Home sections *Best sellers / New arrivals / Recommended* appear only when products are flagged by admin (otherwise "Latest ingredients"); *Reviews* appears only when approved reviews exist.
3. Legal/policy pages are placeholders until the owner provides text.
4. Visual direction: clean clinical-premium (navy/sky/green, Fraunces + Inter) derived from the logo.
5. Header uses the official emblem + live text; the full unmodified lockup is used in hero/footer/auth/invoices.

## Architecture
Modular monolith (Next.js 15 App Router, TypeScript, MUI 6, Zustand, TanStack Query, Mongoose).
```
src/app            routes: (store) (auth) admin super-admin api
src/components     UI (common, navigation, products, cart, checkout, account, admin, animations, forms)
src/modules        business logic (orders/pricing, payments, products, users, analytics, settings, audit, reviews, content)
src/database       models, repositories (interfaces + mongo), seeds
src/services       razorpay, cloudinary, email adapters
src/stores         zustand: auth, cart, wishlist, ui, filter, recently-viewed
src/lib            api wrapper, auth/session, security, cache, api-client
tests              unit, integration (in-memory MongoDB), e2e (Playwright)
```
Rule: pages are thin; logic in `modules`; DB only behind repository interfaces.

## State & caching
Zustand: UI/cart/wishlist/filters/recents (persisted ids only; prices/stock never trusted). TanStack Query: product lists/details (60 s stale), categories (10 min), cart pricing (15 s), orders, addresses, admin lists/dashboards; mutations invalidate by key (`src/lib/query-keys.ts`). Server pages use `unstable_cache` (tag `catalog`, revalidated on admin writes).

## Performance/SEO
SSR product pages with metadata, OG, canonical, Product + Breadcrumb JSON-LD, sitemap/robots, `next/image` (Cloudinary `f_auto,q_auto`), font optimisation, code-splitting (charts lazy), reduced-motion support, route loading/error/404 boundaries.

## Phase status
1-9 implemented. Open items: owner content (prices, images, policies), live-key testing, Playwright E2E needs a running DB + Razorpay test keys (specs provided), MySQL migration (documented only).
