'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import { useAdminList } from '@/hooks/useAdmin';
import { ApiError, get, post, put } from '@/lib/api-client';
import { useCan } from '@/hooks/useCan';
import { useUiStore } from '@/stores/ui.store';
import { ORDER_STATUSES } from '@/types/domain';
import { DataTable, PageHeader, Panel, dateTime, money, type Column } from './ui';
import { ErrorNote, StatusChip } from '@/components/common/ui';
import OrderTimeline from '@/components/account/OrderTimeline';
import { brand } from '@/theme/tokens';

interface OrderRow { id: string; orderNumber: string; customerEmail: string; totalPaise: number; status: string; paymentStatus: string; createdAt: string; shippingAddress?: { fullName: string } }

export function OrdersList() {
  const router = useRouter();
  const sp = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(sp.get('search') ?? '');
  const [term, setTerm] = useState(sp.get('search') ?? '');
  const [status, setStatus] = useState('');
  const [pay, setPay] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data, isLoading } = useAdminList<OrderRow>('orders', { page, limit: 20, search: term || undefined, status: status || undefined, paymentStatus: pay || undefined, from: from ? new Date(from).toISOString() : undefined, to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined });
  const cols: Column<OrderRow>[] = [
    { key: 'orderNumber', label: 'Order', primary: true, render: (o) => <b>{o.orderNumber}</b> },
    { key: 'customer', label: 'Customer', render: (o) => <Box><Typography variant="body2" sx={{ fontWeight: 600 }}>{o.shippingAddress?.fullName}</Typography><Typography variant="caption" color="text.secondary">{o.customerEmail}</Typography></Box> },
    { key: 'totalPaise', label: 'Total', align: 'right', render: (o) => money(o.totalPaise) },
    { key: 'status', label: 'Status', render: (o) => <StatusChip status={o.status} /> },
    { key: 'paymentStatus', label: 'Payment', render: (o) => <StatusChip status={o.paymentStatus} /> },
    { key: 'createdAt', label: 'Date', hideOnMobile: true, render: (o) => dateTime(o.createdAt) },
  ];
  return (
    <Box>
      <PageHeader title="Orders" subtitle="Search, filter and fulfil customer orders." />
      <Box component="form" onSubmit={(e) => { e.preventDefault(); setTerm(search); setPage(1); }} sx={{ display: 'grid', gap: 1.5, mb: 2, gridTemplateColumns: { xs: '1fr 1fr', md: '2fr 1fr 1fr 1fr 1fr auto' } }}>
        <TextField size="small" placeholder="Order no., email, name…" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }} />
        <TextField select size="small" label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><MenuItem value="">All</MenuItem>{ORDER_STATUSES.map((s) => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s.replace(/_/g, ' ')}</MenuItem>)}</TextField>
        <TextField select size="small" label="Payment" value={pay} onChange={(e) => { setPay(e.target.value); setPage(1); }}><MenuItem value="">All</MenuItem>{['unpaid', 'paid', 'failed', 'refunded', 'partially_refunded'].map((s) => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s.replace(/_/g, ' ')}</MenuItem>)}</TextField>
        <TextField size="small" type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <Button type="submit" variant="outlined">Search</Button>
      </Box>
      <DataTable columns={cols} rows={data?.items ?? []} getId={(o) => o.id} loading={isLoading} onRowClick={(o) => router.push(`/admin/orders/${o.id}`)} page={page} limit={data?.limit ?? 20} total={data?.total} onPage={setPage} empty="No orders match your filters." />
    </Box>
  );
}

interface Detail {
  order: any; items: any[]; payments: any[]; refunds: any[]; allowedTransitions: string[];
}

export function OrderDetailAdmin({ id }: { id: string }) {
  const qc = useQueryClient();
  const notify = useUiStore((s) => s.notify);
  const can = useCan();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin', 'orders', 'item', id], queryFn: () => get<Detail>(`/api/admin/orders/${id}`) });
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [track, setTrack] = useState<{ carrier: string; trackingNumber: string; url: string } | null>(null);
  const [refund, setRefund] = useState<{ amount: string; reason: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin', 'orders'] }); refetch(); };
  const act = async (fn: () => Promise<unknown>, ok: string) => { setBusy(true); try { await fn(); notify(ok); refresh(); return true; } catch (e) { notify(e instanceof ApiError ? e.message : 'Action failed', 'error'); return false; } finally { setBusy(false); } };

  if (isLoading) return <Skeleton variant="rounded" height={420} />;
  if (error || !data) return <ErrorNote error={error ?? new Error('Order not found')} onRetry={() => refetch()} />;
  const { order, items, payments, refunds, allowedTransitions } = data;
  const payment = payments.at(-1);
  const refundable = payment ? payment.amountPaise - payment.refundedPaise : 0;
  const trackingForm = track ?? { carrier: order.tracking?.carrier ?? '', trackingNumber: order.tracking?.trackingNumber ?? '', url: order.tracking?.url ?? '' };

  return (
    <Box>
      <PageHeader title={`Order ${order.orderNumber}`} subtitle={`Placed ${dateTime(order.createdAt)} · ${order.customerEmail}`} actions={<>
        <Button component={Link} href="/admin/orders">Back</Button>
        {['paid', 'partially_refunded', 'refunded'].includes(order.paymentStatus) && <Button component="a" href={`/orders/${id}/invoice`} target="_blank" variant="outlined">Print invoice</Button>}
      </>} />
      {order.statusHistory?.some((h: any) => String(h.note ?? '').startsWith('STOCK_CONFLICT')) && <Alert severity="error" sx={{ mb: 2 }}>Stock conflict: this order was paid but stock could not be fully reserved. Review and fulfil, or refund the customer.</Alert>}
      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1.7fr 1fr' }, alignItems: 'start' }}>
        <Box sx={{ display: 'grid', gap: 2.5 }}>
          <Panel title="Items">
            {items.map((i: any) => (
              <Box key={i.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 1.25, borderTop: `1px solid ${brand.line}`, '&:first-of-type': { borderTop: 0 } }}>
                <Box><Typography sx={{ fontWeight: 600 }}>{i.productName}</Typography><Typography variant="caption" color="text.secondary">{i.variantLabel} · SKU {i.sku} · {money(i.unitPricePaise)} × {i.quantity}</Typography></Box>
                <Typography sx={{ fontWeight: 700 }}>{money(i.lineTotalPaise)}</Typography>
              </Box>
            ))}
            <Divider sx={{ my: 1.5 }} />
            {[['Subtotal', order.subtotalPaise], ['Discount', -order.discountPaise], ['Shipping', order.shippingPaise], ['Tax', order.taxPaise]].filter(([, v]) => Number(v) !== 0).map(([l, v]) => <Box key={String(l)} sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography color="text.secondary">{l}</Typography><Typography>{money(Number(v))}</Typography></Box>)}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}><Typography sx={{ fontWeight: 800 }}>Total</Typography><Typography sx={{ fontWeight: 800 }}>{money(order.totalPaise)}</Typography></Box>
          </Panel>
          <Panel title="Addresses">
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              {[['Shipping', order.shippingAddress], ['Billing', order.billingAddress]].map(([t, a]: any) => <Box key={t}><Typography variant="overline" color="text.secondary">{t}</Typography><Typography variant="body2">{a.fullName}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.state} {a.postalCode}<br />{a.phone}{a.gstin ? <><br />GSTIN {a.gstin}</> : null}</Typography></Box>)}
            </Box>
            {order.notes && <Alert severity="info" sx={{ mt: 2 }}>Customer note: {order.notes}</Alert>}
          </Panel>
          {can('payments.read') && (
            <Panel title="Payment">
              {payments.length === 0 ? <Typography color="text.secondary">No payment attempts.</Typography> : payments.map((p: any) => (
                <Box key={p.id} sx={{ display: 'grid', gap: 0.5, py: 1, borderTop: `1px solid ${brand.line}`, '&:first-of-type': { borderTop: 0 } }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}><StatusChip status={p.status} /><Typography variant="body2">{money(p.amountPaise)}</Typography>{p.method && <Typography variant="caption" color="text.secondary">via {p.method}</Typography>}</Box>
                  <Typography variant="caption" color="text.secondary">Razorpay order: {p.providerOrderId}{p.providerPaymentId ? ` · payment: ${p.providerPaymentId}` : ''}</Typography>
                  <Typography variant="caption" color={p.signatureVerified ? 'success.main' : 'text.secondary'}>{p.signatureVerified ? `Verified ${dateTime(p.verifiedAt)}` : 'Not verified'}{p.failureReason ? ` · ${p.failureReason}` : ''}</Typography>
                </Box>
              ))}
              {refunds.map((r: any) => <Typography key={r.id} variant="body2" sx={{ mt: 1 }}>Refund {money(r.amountPaise)} · <StatusChip status={r.status} /> {r.reason ? `· ${r.reason}` : ''}</Typography>)}
            </Panel>
          )}
        </Box>

        <Box sx={{ display: 'grid', gap: 2.5 }}>
          <Panel title="Status">
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}><StatusChip status={order.status} /><StatusChip status={order.paymentStatus} /></Box>
            <OrderTimeline status={order.status} history={order.statusHistory} />
            {can('orders.update') && allowedTransitions.length > 0 && (
              <Box sx={{ mt: 2.5, display: 'grid', gap: 1.5 }}>
                <TextField select size="small" label="Move to" value={target} onChange={(e) => setTarget(e.target.value)}>{allowedTransitions.map((s) => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s.replace(/_/g, ' ')}</MenuItem>)}</TextField>
                <TextField size="small" label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
                <Button variant="contained" disabled={!target || busy} color={target === 'cancelled' || target === 'returned' ? 'error' : 'primary'} onClick={() => act(() => post(`/api/admin/orders/${id}/status`, { status: target, note: note || undefined }), 'Status updated').then((ok) => { if (ok) { setTarget(''); setNote(''); } })}>Update status</Button>
              </Box>
            )}
            {order.status === 'payment_pending' && <Alert severity="info" sx={{ mt: 2 }}>Awaiting verified payment. Orders can only become paid through Razorpay verification (checkout callback or webhook) – never manually.</Alert>}
          </Panel>
          {can('orders.update') && (
            <Panel title="Shipping & tracking" action={!track && <Button size="small" onClick={() => setTrack(trackingForm)}>Edit</Button>}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Method: {order.shippingMethod?.name}</Typography>
              {track ? (
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  <TextField size="small" label="Carrier" value={track.carrier} onChange={(e) => setTrack({ ...track, carrier: e.target.value })} />
                  <TextField size="small" label="Tracking number" value={track.trackingNumber} onChange={(e) => setTrack({ ...track, trackingNumber: e.target.value })} />
                  <TextField size="small" label="Tracking URL" value={track.url} onChange={(e) => setTrack({ ...track, url: e.target.value })} />
                  <Box sx={{ display: 'flex', gap: 1 }}><Button variant="contained" disabled={busy} onClick={() => act(() => put(`/api/admin/orders/${id}/tracking`, track), 'Tracking saved').then((ok) => ok && setTrack(null))}>Save</Button><Button onClick={() => setTrack(null)}>Cancel</Button></Box>
                </Box>
              ) : order.tracking?.trackingNumber ? <Typography variant="body2">{order.tracking.carrier} · <b>{order.tracking.trackingNumber}</b></Typography> : <Typography variant="body2" color="text.secondary">No tracking added yet.</Typography>}
            </Panel>
          )}
          {can('orders.refund') && payment && refundable > 0 && (
            <Panel title="Refund">
              <Typography variant="body2" color="text.secondary">Refundable: {money(refundable)}</Typography>
              <Button sx={{ mt: 1.5 }} variant="outlined" color="error" onClick={() => setRefund({ amount: String(refundable / 100), reason: '' })}>Issue refund</Button>
            </Panel>
          )}
        </Box>
      </Box>

      <Dialog open={Boolean(refund)} onClose={() => setRefund(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Issue refund</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          <TextField label="Amount (₹)" type="number" value={refund?.amount ?? ''} onChange={(e) => setRefund((r) => r && { ...r, amount: e.target.value })} helperText={`Maximum ${money(refundable)}`} />
          <TextField label="Reason" value={refund?.reason ?? ''} onChange={(e) => setRefund((r) => r && { ...r, reason: e.target.value })} />
          <Alert severity="warning">The refund is sent to Razorpay immediately and cannot be undone.</Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={() => setRefund(null)}>Cancel</Button><Button color="error" variant="contained" disabled={busy} onClick={() => refund && act(() => post(`/api/admin/orders/${id}/refund`, { amountPaise: Math.round(Number(refund.amount) * 100), reason: refund.reason || undefined }), 'Refund issued').then((ok) => ok && setRefund(null))}>Refund</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
