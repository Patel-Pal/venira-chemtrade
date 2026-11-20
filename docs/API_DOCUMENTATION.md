# API Documentation

Base: same origin, JSON. Success: `{ "data": ... }`. Error: `{ "error": { "code", "message", "details?" } }` (422 validation: `details: [{path,message}]`).
Auth: HttpOnly cookie `vc_session`. Mutating requests must be same-origin. "perm" = server-enforced permission.

## Public
| Method | Path | Notes |
|---|---|---|
| GET | `/api/products` | `page, limit, q, category, minPrice, maxPrice (INR), inStock, minRating, sort(newest/price_asc/price_desc/popularity/rating), featured, bestSeller, newArrival`; searches name, SKU, description, category |
| GET | `/api/products/:slug` | Published only |
| GET/POST | `/api/products/:slug/reviews` | GET approved + stats; POST (signed-in) creates a pending review |
| GET | `/api/products/by-ids?ids=a,b` | Wishlist / recently viewed |
| GET | `/api/categories` | With product counts |
| GET | `/api/search/suggest?q=` | Products + categories |
| POST | `/api/cart/price` | Authoritative pricing `{items[{variantId,quantity}], couponCode?, shippingMethodId?}` |
| GET | `/api/pages/:slug` | Published CMS page |
| POST | `/api/enquiries`, `/api/newsletter` | Contact / quote request, newsletter |
| POST | `/api/webhooks/razorpay` | HMAC over raw body; header `x-razorpay-signature`, `x-razorpay-event-id` |
| GET | `/api/cron/release-reservations` | `Authorization: Bearer CRON_SECRET` |

## Auth (`/api/auth/*`)
`POST register | login | logout | forgot-password | reset-password | change-password`, `POST/PUT verify-email` (PUT resends), `GET me` (session + permissions).

## Customer (signed in)
`GET/PUT/POST /api/cart` (get / replace / merge guest cart), `GET/POST/DELETE /api/wishlist`, `GET/PATCH /api/users/me`, `GET/POST /api/users/addresses`, `PUT/DELETE /api/users/addresses/:id`, `GET /api/users/reviews`, `POST /api/checkout`, `GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders/:id/pay`, `POST /api/orders/:id/cancel`, `POST /api/payments/verify`.

## Admin (`access: staff`, perm in brackets)
| Path | Methods / perm |
|---|---|
| `/api/admin/dashboard?range=today|yesterday|7d|30d|month|custom&from&to` | GET [reports.read] |
| `/api/admin/products`, `/:id` | GET [products.read], POST [products.create], PUT [products.update], DELETE [products.delete] (archive; `?hard=true` only if never ordered) |
| `/api/admin/products/:id/images` | POST multipart `files` / PUT reorder `{order[]}` [products.update + media.upload] |
| `/api/admin/images/:id` | PUT replace / DELETE [products.update]; Cloudinary asset deleted only when unreferenced |
| `/api/admin/uploads` | POST single image (banners/categories/store) [media.upload] |
| `/api/admin/inventory`, `/transactions` | GET [inventory.read]; POST adjust, PUT threshold [inventory.adjust] |
| `/api/admin/orders`, `/:id` | GET [orders.read]; `/:id/status` POST [orders.update (+cancel/refund)]; `/:id/tracking` PUT [orders.update]; `/:id/refund` POST [orders.refund] |
| `/api/admin/customers`, `/:id` | GET [customers.read]; PATCH `{blocked}` [customers.update] |
| `/api/admin/reviews`, `/:id` | GET/PATCH/DELETE [reviews.moderate] |
| `/api/admin/payments` | GET [payments.read] (read-only) |
| `/api/admin/{categories,coupons,banners,pages,shipping-methods,taxes}` (+`/:id`) | CRUD; perms: categories.read/manage, coupons.manage, content.manage, settings.manage |
| `/api/admin/settings` | GET/PUT [settings.manage] (no secrets) |
| `/api/admin/notifications` | GET / PATCH read |

## Super Admin
`/api/super-admin/dashboard` [system.manage], `/admins` GET/POST, `/admins/:id` GET/PATCH, `/admins/:id/access` POST `{action:'reset'|'revoke'}` [admins.manage], `/roles` GET/POST, `/roles/:id` PATCH/DELETE [roles.manage], `/audit-logs` GET [audit.read], `/system` GET/PUT [system.manage].

## Status codes
400 bad request, 401 not signed in, 403 forbidden / cross-origin, 404, 409 conflict (stock, coupon, concurrent edit), 413 too large, 415 bad media type, 422 validation, 429 rate limited, 502 gateway, 503 integration not configured.
