'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import { useOrder } from '@/hooks/useAccount';
import { ErrorNote, StatusChip } from '@/components/common/ui';
import OrderTimeline from './OrderTimeline';
import { ApiError, post } from '@/lib/api-client';
import { openRazorpay } from '@/lib/razorpay-client';
import { qk } from '@/lib/query-keys';
import { useUiStore } from '@/stores/ui.store';
import { formatPaise } from '@/utils/money';
import { brand } from '@/theme/tokens';

export default function OrderDetailView({ id }: { id: string }) {
  const sp = useSearchParams();
  const placed = sp.get('placed');
  const router = useRouter();
  const qc = useQueryClient();
  const notify = useUiStore((s) => s.notify);
  const { data, isLoading, error, refetch } = useOrder(id, placed === 'processing' || placed === 'paid');
  const [busy, setBusy] = useState(false);

  if (isLoading) return <Skeleton variant="rounded" height={400} sx={{ borderRadius: 5 }} />;
  if (error) return <ErrorNote error={error} onRetry={() => refetch()} />;
  if (!data) return null;
  const { order, items } = data;
  const payable = order.status === 'payment_pending' && (!order.reservedUntil || new Date(order.reservedUntil) > new Date());
  const cancellable = ['payment_pending', 'confirmed'].includes(order.status);

  const payNow = async () => {
    setBusy(true);
    try {
      const co = await post<{ keyId: string; amountPaise: number; currency: string; razorpayOrderId: string; orderNumber: string; customer: { name: string; email: string; phone?: string } }>(`/api/orders/${id}/pay`);
      const r = await openRazorpay({ key: co.keyId, amount: co.amountPaise, currency: co.currency, name: 'Venira Chemtrade', description: `Order ${co.orderNumber}`, order_id: co.razorpayOrderId, prefill: { name: co.customer.name, email: co.customer.email, contact: co.customer.phone }, theme: { color: brand.navy } });
      if (r.status === 'success') {
        const v = await post<{ status: string }>('/api/payments/verify', r.response);
        notify(v.status === 'paid' ? 'Payment received. Thank you!' : 'Payment is being confirmed…', 'success');
        qc.invalidateQueries({ queryKey: qk.orders.all });
      } else if (r.status === 'failed') notify(r.message, 'error');
    } catch (e) {
      notify(e instanceof ApiError ? e.message : 'Could not start payment', 'error');
    } finally {
      setBusy(false);
    }
  };
  const cancel = async () => {
    if (!window.confirm('Cancel this order?')) return;
    setBusy(true);
    try { await post(`/api/orders/${id}/cancel`); notify('Order cancelled', 'info'); qc.invalidateQueries({ queryKey: qk.orders.all }); }
    catch (e) { notify(e instanceof Error ? e.message : 'Could not cancel', 'error'); }
    finally { setBusy(false); }
  };

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      {placed === 'paid' && <Alert severity="success">Thank you! Your payment was received and your order is confirmed.</Alert>}
      {placed === 'processing' && <Alert severity="info">Your payment is being confirmed by the bank. This page updates automatically.</Alert>}
      {placed === 'failed' && <Alert severity="error">Your payment did not go through. You can try again below.</Alert>}
      {placed === 'pending' && <Alert severity="warning">Payment was not completed. You can complete it below while your items are reserved.</Alert>}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h2">Order {order.orderNumber}</Typography>
          <Typography color="text.secondary" variant="body2">Placed {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <StatusChip status={order.status} />
          <StatusChip status={order.paymentStatus} />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        {payable && <Button variant="contained" onClick={payNow} disabled={busy}>Pay {formatPaise(order.totalPaise)} now</Button>}
        {cancellable && <Button color="error" variant="outlined" onClick={cancel} disabled={busy}>Cancel order</Button>}
        {order.paymentStatus === 'paid' || order.paymentStatus === 'partially_refunded' ? <Button component={Link} href={`/orders/${id}/invoice`} variant="outlined" target="_blank">View invoice</Button> : null}
        <Button onClick={() => router.push('/account/orders')}>All orders</Button>
      </Box>

      <Box sx={{ bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 5, p: { xs: 2, md: 3 } }}>
        <Typography variant="h5" component="h3" sx={{ mb: 2 }}>Order tracking</Typography>
        <OrderTimeline status={order.status} history={order.statusHistory} />
        {order.tracking && (order.tracking.trackingNumber || order.tracking.carrier) && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {order.tracking.carrier && <>Carrier: <b>{order.tracking.carrier}</b>. </>}
            {order.tracking.trackingNumber && <>Tracking number: <b>{order.tracking.trackingNumber}</b>. </>}
            {order.tracking.url && <a href={order.tracking.url} target="_blank" rel="noopener noreferrer">Track shipment</a>}
          </Alert>
        )}
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' }, alignItems: 'start' }}>
        <Box sx={{ bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 5, p: { xs: 2, md: 3 } }}>
          <Typography variant="h5" component="h3" sx={{ mb: 2 }}>Items</Typography>
          {items.map((i) => (
            <Box key={i.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 1.25, borderTop: `1px solid ${brand.line}`, '&:first-of-type': { borderTop: 0 } }}>
              <Box><Typography sx={{ fontWeight: 600 }}>{i.productName}</Typography><Typography variant="caption" color="text.secondary">{i.variantLabel} · {i.sku} · {formatPaise(i.unitPricePaise)} × {i.quantity}</Typography></Box>
              <Typography sx={{ fontWeight: 700 }}>{formatPaise(i.lineTotalPaise)}</Typography>
            </Box>
          ))}
          <Divider sx={{ my: 1.5 }} />
          {[['Subtotal', order.subtotalPaise], ...(order.discountPaise ? [[`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`, -order.discountPaise]] : []), ['Shipping', order.shippingPaise], ...(order.taxPaise ? [['Tax', order.taxPaise]] : [])].map(([l, v]) => (
            <Box key={String(l)} sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography color="text.secondary">{l}</Typography><Typography>{Number(v) < 0 ? `− ${formatPaise(-Number(v))}` : formatPaise(Number(v))}</Typography></Box>
          ))}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}><Typography sx={{ fontWeight: 800 }}>Total</Typography><Typography sx={{ fontWeight: 800 }}>{formatPaise(order.totalPaise)}</Typography></Box>
        </Box>
        <Box sx={{ display: 'grid', gap: 2 }}>
          {[['Shipping address', order.shippingAddress], ['Billing address', order.billingAddress]].map(([t, a]) => {
            const ad = a as typeof order.shippingAddress;
            return (
              <Box key={String(t)} sx={{ bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 5, p: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>{String(t)}</Typography>
                <Typography variant="body2" color="text.secondary">{ad.fullName}<br />{ad.line1}{ad.line2 ? `, ${ad.line2}` : ''}<br />{ad.city}, {ad.state} {ad.postalCode}<br />{ad.phone}</Typography>
              </Box>
            );
          })}
          <Box sx={{ bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 5, p: 2.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>Shipping method</Typography>
            <Typography variant="body2" color="text.secondary">{order.shippingMethod.name}</Typography>
            {data.payment?.method && <Typography variant="body2" color="text.secondary">Paid via {data.payment.method}</Typography>}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
