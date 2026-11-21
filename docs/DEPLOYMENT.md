# Deployment

Target: Vercel (or any Node 20+ host) + MongoDB Atlas + Cloudinary + Razorpay + an email provider (Resend HTTP API).

## 1. Services
1. **MongoDB Atlas**: create cluster, a least-privilege DB user, allow the host's egress IPs, copy the SRV URI -> `MONGODB_URI`. Enable continuous backup (PITR). Replica set is default on Atlas (needed for future transactions).
2. **Cloudinary**: cloud name / API key / secret -> `CLOUDINARY_*`. Images go to `venira/*` folders.
3. **Razorpay**: Test keys first (`rzp_test_*`). See `PAYMENT_FLOW.md` for webhook setup.
4. **Email**: Resend API key + verified sender -> `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM`. Without a key, emails are logged (dev) and new customers are auto-verified **only outside production**.

## 2. Environment variables
Copy `.env.example`. Required in production: `MONGODB_URI`, `AUTH_SECRET` (>= 32 random chars), `NEXT_PUBLIC_APP_URL` (https), Razorpay x3, Cloudinary x3, email x2, `CRON_SECRET`. Validated lazily at first use by `src/config/env.ts` (clear error message). **Never commit `.env`** (git-ignored).

## 3. Build & run
```bash
npm ci
npm run typecheck && npm run lint && npm test       # unit + integration (downloads an in-memory mongod once)
npm run build
npm run start
```

## 4. First-time data
```bash
npm run seed                 # roles, permissions, settings, categories, 142 catalogue entries, placeholder pages (idempotent)
# one-time admin:
BOOTSTRAP_SUPER_ADMIN_EMAIL=you@company.com BOOTSTRAP_SUPER_ADMIN_PASSWORD='<12+ chars>' npm run bootstrap:admins
# then remove the BOOTSTRAP_* variables
```
`bootstrap:superadmin` refuses to run if a Super Admin already exists. Scripts read `.env` (`tsx --env-file=.env`); on a server pass variables through the environment instead.

## 5. Webhook
Razorpay Dashboard -> Settings -> Webhooks -> Add: URL `https://<your-domain>/api/webhooks/razorpay`, secret = `RAZORPAY_WEBHOOK_SECRET`, events `payment.captured, payment.failed, order.paid, refund.created, refund.processed, refund.failed`. Use the dashboard "test webhook" to confirm a 200.

## 6. Scheduled job
Vercel Cron (`vercel.json`): `{"crons":[{"path":"/api/cron/release-reservations","schedule":"*/5 * * * *"}]}` with `CRON_SECRET` set (Vercel sends it as a Bearer token). Elsewhere: `curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/release-reservations` every 5 min.

## 7. Go-live checklist
- Replace placeholder policy pages (Admin > Banners & content > Pages), add FAQ, brand story, social links, contact email.
- Add prices, pack sizes, descriptions and images to products (items marked "Info pending"); set shipping rates and GST (Admin > Settings).
- Swap Razorpay test keys for live keys only after a full test-mode run (success, failure, refund, webhook retry).
- Verify the sitemap (`/sitemap.xml`) and set `NEXT_PUBLIC_APP_URL` to the final domain.
- Configure Atlas backups, alerts, IP allow-list. Set up log drain/monitoring.
- Run `npm audit --omit=dev` in CI.

## 8. Backup strategy
Atlas continuous backup + daily snapshot (retain 7 daily / 4 weekly); quarterly restore drill into a scratch cluster; Cloudinary assets are referenced by `publicId` in `product_images`/banners (export the admin API listing monthly); keep Razorpay as the payment source of truth for reconciliation.
