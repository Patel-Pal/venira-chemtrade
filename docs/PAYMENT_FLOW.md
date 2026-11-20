# Payment Flow (Razorpay)

All money logic is server-side. Code: `src/modules/orders/*`, `src/modules/payments/payment.service.ts`, `src/services/razorpay`.

```
Browser                          Server                               Razorpay
  | POST /api/checkout ---------> validate user (active + verified email)
  |                               re-price cart from DB (prices, stock, coupon, tax, shipping)
  |                               create order(payment_pending, reservedUntil = now+N min)   [idempotency key]
  |                               reserve stock per tracked variant (atomic, idempotent)
  |                               orders.create ------------------------------------------>
  |  <---- {razorpayOrderId, key} create payment(created)
  | open Razorpay Checkout ------------------------------------------------------------>
  | <---- {order_id, payment_id, signature}
  | POST /api/payments/verify --> ownership check -> HMAC(order|payment, KEY_SECRET) compare (timing-safe)
  |                               GET payment from Razorpay -> check order id, amount, currency, status=captured
  |                               confirmPayment(): payment=captured; order payment_pending->confirmed (atomic CAS)
  |                               winner: commit stock, sales count, coupon usage, email, admin notification, audit
  |                                          POST /api/webhooks/razorpay (raw body) <---- payment.captured / payment.failed / refund.*
  |                               verify HMAC(rawBody, WEBHOOK_SECRET); dedupe by x-razorpay-event-id
  |                               confirmPayment() again => 'already_confirmed' (no double commit)
```

## Guarantees
- **No trust in the browser**: totals recomputed; browser signature verified; payment re-fetched from Razorpay (amount/currency/order/status).
- **Idempotency**: client key per attempt (unique per user), unique `providerOrderId`/`providerPaymentId`, unique `eventId`, unique inventory tx per (variant,type,order), unique coupon usage per order, atomic order status compare-and-set. Verify and webhook may race safely (covered by an integration test).
- **Failed payments**: `payment.failed` marks the attempt failed; the order stays `payment_pending` so the customer can retry from the order page (`POST /api/orders/:id/pay`) until the reservation expires.
- **Expiry**: `GET /api/cron/release-reservations` (Bearer `CRON_SECRET`) and opportunistic cleanup in checkout cancel unpaid orders after `CHECKOUT_RESERVATION_MINUTES` and release stock.
- **Delayed webhook after expiry**: order becomes `confirmed`, stock is re-reserved and committed under `<orderId>:late`; if stock is gone the order is flagged `STOCK_CONFLICT` with an admin notification for refund/fulfilment.
- **Amount mismatch**: payment marked failed with reason, audit entry, order is **not** confirmed.
- **Refunds**: Admin (`orders.refund`) -> Razorpay refund API -> `payment_refunds` row; `refund.*` webhooks sync status. Over-refund is rejected.
- **No manual "mark paid"**: there is no endpoint and the admin transition table forbids it; admin Payments is read-only.
- **No card data** is ever received or stored.

## Required Razorpay settings
- Test mode keys `rzp_test_*` in non-production. Enable **auto-capture** (the server confirms on `captured`; `authorized`-only payments wait for capture).
- Webhook URL: `https://<domain>/api/webhooks/razorpay`; secret = `RAZORPAY_WEBHOOK_SECRET`; events: `payment.captured`, `payment.failed`, `order.paid`, `refund.created`, `refund.processed`, `refund.failed`.
- Test cards/UPI: use Razorpay's published test credentials. Never run real payments in development.
