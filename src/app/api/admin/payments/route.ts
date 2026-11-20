import { z } from 'zod';
import { route, parseQuery } from '@/lib/api';
import { getRepos } from '@/database/repositories';
import { pageQuerySchema } from '@/schemas';

/** Read-only by design: there is NO endpoint to mark a payment as paid manually. */
export const GET = route({ access: 'staff', permission: 'payments.read' }, async ({ req }) => {
  const q = parseQuery(req, pageQuerySchema.extend({ status: z.enum(['created', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded']).optional(), search: z.string().trim().max(60).optional() }));
  const repos = await getRepos();
  const [page, stats] = await Promise.all([repos.payments.list(q), repos.payments.stats()]);
  const orders = await Promise.all(page.items.map((p) => repos.orders.findById(p.orderId)));
  return {
    ...page, stats,
    items: page.items.map((p, i) => ({
      id: p.id, orderId: p.orderId, orderNumber: orders[i]?.orderNumber, providerOrderId: p.providerOrderId, providerPaymentId: p.providerPaymentId,
      amountPaise: p.amountPaise, currency: p.currency, status: p.status, method: p.method, refundedPaise: p.refundedPaise,
      signatureVerified: p.signatureVerified, verifiedAt: p.verifiedAt, failureReason: p.failureReason, createdAt: p.createdAt,
    })),
  };
});
