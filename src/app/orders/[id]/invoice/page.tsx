import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { getAuth, hasPermission } from '@/lib/auth';
import { getOrderDetail } from '@/modules/orders/order.service';
import { getStoreSettings } from '@/modules/settings/settings.service';
import { LogoFull } from '@/components/common/Logo';
import PrintButton from '@/components/common/PrintButton';
import { formatPaise } from '@/utils/money';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Invoice', robots: { index: false } };

/** Printable invoice. Customers see only their own; staff need orders.read. Only paid orders can be invoiced. */
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAuth();
  if (!auth) redirect(`/login?next=/orders/${id}/invoice`);
  const staffAccess = auth.isStaff && hasPermission(auth, 'orders.read');
  const d = await getOrderDetail(id, staffAccess ? undefined : auth.user.id);
  if (!d || !['paid', 'partially_refunded', 'refunded'].includes(d.order.paymentStatus)) notFound();
  const s = await getStoreSettings();
  const { order, items } = d;
  const addr = order.billingAddress;
  return (
    <Box sx={{ maxWidth: 820, mx: 'auto', p: { xs: 2, md: 5 }, bgcolor: '#fff', minHeight: '100vh', '@media print': { p: 0 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 3, flexWrap: 'wrap' }}>
        <LogoFull height={110} />
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="h3" component="h1">Tax invoice</Typography>
          <Typography>No. {order.orderNumber}</Typography>
          <Typography variant="body2" color="text.secondary">{new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}</Typography>
        </Box>
      </Box>
      <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        <Box><Typography variant="overline" color="text.secondary">From</Typography><Typography sx={{ fontWeight: 700 }}>{s.storeName}</Typography><Typography variant="body2">{s.address}<br />{s.contactPhone}</Typography></Box>
        <Box><Typography variant="overline" color="text.secondary">Billed to</Typography><Typography sx={{ fontWeight: 700 }}>{addr.fullName}</Typography><Typography variant="body2">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />{addr.city}, {addr.state} {addr.postalCode}{addr.gstin ? <><br />GSTIN: {addr.gstin}</> : null}</Typography></Box>
      </Box>
      <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', mt: 4, '& th, & td': { textAlign: 'left', py: 1.25, borderBottom: '1px solid #e3e9f1' }, '& .num': { textAlign: 'right' } }}>
        <thead><tr><th>Item</th><th>SKU</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Amount</th></tr></thead>
        <tbody>
          {items.map((i) => <tr key={i.id}><td>{i.productName} <small>({i.variantLabel})</small></td><td>{i.sku}</td><td className="num">{i.quantity}</td><td className="num">{formatPaise(i.unitPricePaise)}</td><td className="num">{formatPaise(i.lineTotalPaise)}</td></tr>)}
        </tbody>
      </Box>
      <Box sx={{ ml: 'auto', mt: 3, maxWidth: 320, display: 'grid', gap: 0.5 }}>
        {[['Subtotal', order.subtotalPaise], ['Discount', -order.discountPaise], ['Shipping', order.shippingPaise], ['Tax', order.taxPaise]].filter(([, v]) => Number(v) !== 0).map(([l, v]) => (
          <Box key={String(l)} sx={{ display: 'flex', justifyContent: 'space-between' }}><span>{l}</span><span>{Number(v) < 0 ? `− ${formatPaise(-Number(v))}` : formatPaise(Number(v))}</span></Box>
        ))}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.2rem', borderTop: '2px solid #12233F', pt: 1 }}><span>Total</span><span>{formatPaise(order.totalPaise)}</span></Box>
      </Box>
      <Box sx={{ mt: 6, '@media print': { display: 'none' } }}><PrintButton /></Box>
    </Box>
  );
}
