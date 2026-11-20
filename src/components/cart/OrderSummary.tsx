'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import type { PricedCart } from '@/modules/orders/cart.service';
import { formatPaise } from '@/utils/money';
import { brand } from '@/theme/tokens';

const Row = ({ label, value, strong, positive }: { label: string; value: string; strong?: boolean; positive?: boolean }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
    <Typography sx={{ fontWeight: strong ? 800 : 500, fontSize: strong ? '1.15rem' : '0.95rem' }} color={strong ? 'text.primary' : 'text.secondary'}>{label}</Typography>
    <Typography sx={{ fontWeight: strong ? 800 : 600, fontSize: strong ? '1.15rem' : '0.95rem', color: positive ? 'success.dark' : 'text.primary' }}>{value}</Typography>
  </Box>
);

export default function OrderSummary({ cart, shippingLabel, children }: { cart: PricedCart; shippingLabel?: string; children?: React.ReactNode }) {
  const t = cart.totals;
  return (
    <Box sx={{ bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 5, p: 2.5, display: 'grid', gap: 1.5 }}>
      <Typography variant="h5" component="h2">Order summary</Typography>
      <Row label="Subtotal" value={formatPaise(t.subtotalPaise)} />
      {t.discountPaise > 0 && <Row label={`Discount${cart.coupon ? ` (${cart.coupon.code})` : ''}`} value={`− ${formatPaise(t.discountPaise)}`} positive />}
      <Row label={shippingLabel ?? 'Shipping'} value={t.shippingPaise === 0 ? 'Free' : formatPaise(t.shippingPaise)} />
      {(t.taxPaise > 0 || cart.taxLabel) && <Row label={cart.taxLabel ?? 'Tax'} value={formatPaise(t.taxPaise)} />}
      <Divider />
      <Row label="Total" value={formatPaise(t.totalPaise)} strong />
      <Typography variant="caption" color="text.secondary">Final amounts are calculated securely on our servers at checkout.</Typography>
      {children}
    </Box>
  );
}
