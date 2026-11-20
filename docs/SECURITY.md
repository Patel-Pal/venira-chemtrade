# Security

## Authentication & sessions
- Passwords: **bcrypt (cost 12)**; password policy 8+ chars with letter+number; constant-time-ish login (dummy hash for unknown users); generic error messages (no account enumeration on login/register/forgot).
- Session: signed JWT (HS256, `AUTH_SECRET`) in cookie `vc_session` - **HttpOnly, SameSite=Lax, Secure in production, 7 days**. The JWT carries only a random id; the server stores `sha256(id)` in `sessions` and checks it on every request, so sessions can be **revoked** (logout, password change/reset, block, admin "revoke sessions") and blocked/deactivated users lose access immediately.
- Login throttling: per-IP and per-email rate limits + account lockout (5 failures -> 15 min).
- Email verification and password reset use random single-use tokens stored **hashed**, with expiry (24 h / 1 h). Reset/change revokes all sessions.
- Structure is OAuth-ready: `users.authProviders[]`, nullable password hash.
- Nothing sensitive in `localStorage`: Zustand persists only cart ids/quantities, wishlist ids, recently viewed, recent searches.

## Authorization (RBAC)
- Source of truth: `src/constants/permissions.ts` (25 permissions, 7 roles). Roles in DB; users may have extra permissions.
- **Every API route** is wrapped by `route({access, permission})` (`src/lib/api.ts`) which resolves the session from the DB and checks permissions server-side. Admin/Super-Admin layouts re-check on the server; middleware is only a cheap pre-filter.
- Resource-level checks: customer orders/addresses/cart queries include the user id in the filter (other customers' orders are "not found").
- Privilege escalation prevention (`admin-users.service.ts`): only Super Admin can assign Super Admin; you can only grant permissions you hold; no self role/permission/status edits; Super Admin role immutable; system roles undeletable; role permission changes apply instantly (permissions are resolved per request).
- Hiding UI (`useCan`) is cosmetic only.

## API & application hardening
- Zod validation on every body/query; schemas expose only whitelisted keys (**mass-assignment safe**); ids validated as 24-hex (**NoSQL operator injection** rejected - tested); no raw user objects reach Mongo filters; regex input is escaped.
- Same-origin check on mutating requests (CSRF) + SameSite cookies; JSON body size limit 1 MB; upload limits (5 MB, 10 images, magic-byte sniffing, MIME allow-list).
- Rate limits (in-memory sliding window; swap for Redis/Upstash on multi-instance hosting): auth, checkout, uploads, search, enquiries, newsletter, reviews.
- Security headers + CSP (`next.config.ts`): `frame-ancestors 'none'`, `object-src 'none'`, Razorpay/Cloudinary allow-listed, HSTS in production, `nosniff`, referrer & permissions policies.
- XSS: React escaping everywhere; admin-managed content is plain text rendered by `RichText` (no HTML injection); JSON-LD is escaped; user text sanitised on input.
- Open redirects: `safeNext()` allows only same-site relative paths.
- Errors: safe JSON messages; stack traces/driver errors are only logged (secrets redacted by key name), never returned.
- Secrets only in server env (validated by `src/config/env.ts`); admin Settings shows configured/not-configured booleans; nothing secret uses `NEXT_PUBLIC_`.
- Audit log (`audit_logs`): logins (success/failure), admin actions, product/order/payment/permission/settings changes, with before/after (keys matching password/token/secret/etc. are redacted). **Append-only** at the model layer; production DB users should also be limited to INSERT/SELECT on this collection.
- Dependency checks: run `npm audit` in CI (see DEPLOYMENT.md).

## Known limitations / recommended before go-live
1. Replace the in-memory rate limiter with a shared store when running >1 instance (serverless).
2. Add a CAPTCHA/Turnstile on register/forgot-password if abuse appears.
3. Enable MongoDB Atlas IP allow-list, backups, and a least-privilege DB user.
4. Consider a nonce-based CSP to remove `'unsafe-inline'` scripts (Next.js inline bootstrap currently requires it).
5. Content/legal pages are placeholders until the owner supplies text.
