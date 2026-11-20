# Venira Chemtrade - E-commerce Platform

Next.js 15 (App Router) + TypeScript + MUI + Zustand + TanStack Query + MongoDB (Mongoose) + Cloudinary + Razorpay.
Three experiences: **storefront** (mobile-app feel), **/admin**, **/super-admin** (server-enforced RBAC).

## Quick start
```bash
npm install
cp .env.example .env          # fill MONGODB_URI and AUTH_SECRET at minimum
npm run seed                  # roles, permissions, categories, 142 catalogue entries from the PDF, placeholder pages
BOOTSTRAP_SUPER_ADMIN_EMAIL=you@x.com BOOTSTRAP_SUPER_ADMIN_PASSWORD='long-password-12+' npm run bootstrap:superadmin
npm run dev                   # http://localhost:3000   (admin: /admin, super admin: /super-admin)
```
Without Razorpay/Cloudinary/email keys the store browses, but checkout (503), uploads (503) and emails (logged only) are disabled. New customers are auto-verified only in non-production when no email provider is configured.

## Scripts
`dev`, `build`, `start`, `typecheck`, `lint`, `format`, `test` (unit + integration; first run downloads an in-memory MongoDB), `test:e2e` (Playwright), `seed`, `bootstrap:superadmin`.

## Documentation (`docs/`)
PROJECT_OVERVIEW, **DATABASE_ARCHITECTURE** (Mongo + proposed MySQL schema), **MYSQL_MIGRATION_PLAN**, API_DOCUMENTATION, SECURITY, PAYMENT_FLOW, DEPLOYMENT, PDF_PRODUCT_EXTRACTION.

## Important
- The supplied PDF is an ingredient **name list** - no prices/descriptions. Entries are published as "price on request / info pending". Add data in Admin > Products.
- Logo files in `public/images` are used unmodified (only whitespace-trimmed).
- Never commit `.env`. Use Razorpay **test** keys until the full flow is verified.
