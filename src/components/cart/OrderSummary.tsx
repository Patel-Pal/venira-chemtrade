'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import type { PricedCart } from '@/modules/orders/cart.service';
import { formatPaise } from '@/utils/money';
import { brand, shadows } from '@/theme/tokens';

const Row = ({ label, value, strong, positive }: { label: string; value: string; strong?: boolean; positive?: boolean }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
    <Typography sx={{ fontWeight: strong ? 800 : 500, fontSize: strong ? '1.15rem' : '0.95rem' }} color={strong ? 'text.primary' : 'text.secondary'}>{label}</Typography>
    <Typography sx={{ fontWeight: strong ? 800 : 600, fontSize: strong ? '1.15rem' : '0.95rem', color: positive ? 'success.dark' : 'text.primary' }}>{value}</Typography>
  </Box>
);

export default function OrderSummary({ cart, shippingLabel, children }: { cart: PricedCart; shippingLabel?: string; children?: React.ReactNode }) {
  const t = cart.totals;
  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 5, p: 2.5, display: 'grid', gap: 1.5, boxShadow: shadows.lift, '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${brand.sky}, ${brand.green})` } }}>
      <Typography variant="h5" component="h2" sx={{ color: 'primary.dark', pt: 0.5 }}>Order summary</Typography>
      <Row label="Subtotal" value={formatPaise(t.subtotalPaise)} />
      {t.discountPaise > 0 && <Row label={`Discount${cart.coupon ? ` (${cart.coupon.code})` : ''}`} value={`− ${formatPaise(t.discountPaise)}`} positive />}
      <Row label={shippingLabel ?? 'Shipping'} value={t.shippingPaise === 0 ? 'Free' : formatPaise(t.shippingPaise)} />
      {(t.taxPaise > 0 || cart.taxLabel) && <Row label={cart.taxLabel ?? 'Tax'} value={formatPaise(t.taxPaise)} />}
      <Divider />
      <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: brand.skyLight }}>
        <Row label="Total" value={formatPaise(t.totalPaise)} strong />
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><LockOutlinedIcon sx={{ fontSize: 14 }} /> Final amounts are calculated securely on our servers at checkout.</Typography>
      {children}
    </Box>
  );
}
