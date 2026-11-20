'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Chip from '@mui/material/Chip';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import { useCartPricing } from '@/hooks/useCart';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { EmptyState, ErrorNote, QuantityStepper } from '@/components/common/ui';
import OrderSummary from './OrderSummary';
import type { CartLineDTO } from '@/modules/orders/cart.service';
import { optimizedImage } from '@/utils/image';
import { formatPaise } from '@/utils/money';
import { brand } from '@/theme/tokens';

const ISSUE_TEXT: Record<string, string> = {
  unavailable: 'No longer available',
  price_on_request: 'Price on request – please request a quote',
  out_of_stock: 'Out of stock',
  insufficient_stock: 'Not enough stock for this quantity',
};

function Line({ line }: { line: CartLineDTO }) {
  const { setQuantity, remove } = useCartStore();
  const unpurchasable = line.issue === 'unavailable' || line.issue === 'out_of_stock' || line.issue === 'price_on_request';
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '84px 1fr', gap: 2, p: 2, bgcolor: '#fff', border: `1px solid ${line.issue ? '#f3b8b8' : brand.line}`, borderRadius: 4 }}>
      <Box component={Link} href={`/products/${line.slug}`} sx={{ position: 'relative', width: 84, height: 84, borderRadius: 3, overflow: 'hidden', bgcolor: brand.canvas, display: 'grid', placeItems: 'center' }}>
        {line.imageUrl ? <Image src={optimizedImage(line.imageUrl, 200) ?? line.imageUrl} alt={line.name} fill sizes="84px" style={{ objectFit: 'cover' }} /> : <Image src="/images/logo-mark.png" alt="" width={42} height={38} style={{ opacity: 0.4, height: 'auto' }} />}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography component={Link} href={`/products/${line.slug}`} sx={{ fontWeight: 700, textDecoration: 'none', display: 'block', lineHeight: 1.3 }}>{line.name}</Typography>
            <Typography variant="caption" color="text.secondary">{line.variantLabel} · {line.sku}</Typography>
          </Box>
          <IconButton aria-label={`Remove ${line.name}`} onClick={() => remove(line.variantId)} sx={{ alignSelf: 'flex-start' }}><DeleteOutlineIcon /></IconButton>
        </Box>
        {line.issue && <Chip size="small" color="error" variant="outlined" label={ISSUE_TEXT[line.issue]} sx={{ mt: 0.75, height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.4 } }} />}
        <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {!unpurchasable ? <QuantityStepper size="sm" value={line.quantity} max={line.maxQuantity ?? 10_000} onChange={(n) => setQuantity(line.variantId, n)} /> : <Box />}
          {line.unitPricePaise !== null && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontWeight: 800 }}>{formatPaise(line.lineTotalPaise)}</Typography>
              {line.quantity > 1 && <Typography variant="caption" color="text.secondary">{formatPaise(line.unitPricePaise)} each</Typography>}
            </Box>
          )}
        </Box>
        {line.issue === 'insufficient_stock' && line.maxQuantity ? <Button size="small" sx={{ mt: 0.5 }} onClick={() => setQuantity(line.variantId, line.maxQuantity!)}>Reduce to {line.maxQuantity}</Button> : null}
      </Box>
    </Box>
  );
}

export function CouponBox() {
  const couponCode = useCartStore((s) => s.couponCode);
  const setCoupon = useCartStore((s) => s.setCoupon);
  const [code, setCode] = useState(couponCode);
  return (
    <Box component="form" onSubmit={(e) => { e.preventDefault(); setCoupon(code); }} sx={{ display: 'flex', gap: 1 }}>
      <TextField size="small" placeholder="Coupon code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} slotProps={{ htmlInput: { 'aria-label': 'Coupon code', maxLength: 40 }, input: { startAdornment: <LocalOfferOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> } }} />
      {couponCode ? <Button onClick={() => { setCoupon(''); setCode(''); }} color="inherit">Remove</Button> : <Button type="submit" variant="outlined" disabled={!code.trim()}>Apply</Button>}
    </Box>
  );
}

export default function CartView() {
  const { data: cart, isLoading, error, refetch, items, hydrated } = useCartPricing();
  const status = useAuthStore((s) => s.status);
  const remove = useCartStore((s) => s.remove);

  if (!hydrated || (isLoading && items.length)) {
    return <Box sx={{ display: 'grid', gap: 2 }}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={116} sx={{ borderRadius: 4 }} />)}</Box>;
  }
  if (items.length === 0 || (cart && cart.lines.length === 0)) {
    return <EmptyState icon={<ShoppingBagOutlinedIcon fontSize="large" />} title="Your cart is empty" body="Browse our ingredients and add what you need." action={{ label: 'Start shopping', href: '/products' }} />;
  }
  if (error && !cart) return <ErrorNote error={error} onRetry={() => refetch()} />;
  if (!cart) return null;

  const stale = items.filter((i) => !cart.lines.some((l) => l.variantId === i.variantId));
  const checkoutHref = status === 'authenticated' ? '/checkout' : '/login?next=/checkout';

  return (
    <Box sx={{ display: 'grid', gap: { xs: 3, md: 5 }, gridTemplateColumns: { xs: '1fr', md: '1.6fr 1fr' }, alignItems: 'start' }}>
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        {stale.length > 0 && <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => stale.forEach((s) => remove(s.variantId))}>Remove</Button>}>Some items are no longer in our catalogue.</Alert>}
        {cart.lines.map((l) => <Line key={l.variantId} line={l} />)}
      </Box>
      <Box sx={{ position: { md: 'sticky' }, top: { md: 100 }, display: 'grid', gap: 2 }}>
        <Box sx={{ bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 5, p: 2.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'text.primary' }}>Have a coupon?</Typography>
          <CouponBox />
          {cart.couponError && <Alert severity="warning" sx={{ mt: 1.5 }}>{cart.couponError}</Alert>}
          {cart.coupon && <Alert severity="success" sx={{ mt: 1.5 }}>Coupon {cart.coupon.code} applied.</Alert>}
        </Box>
        <OrderSummary cart={cart} shippingLabel={cart.shippingMethods[0] ? `Shipping (${cart.shippingMethods[0].name})` : 'Shipping'}>
          {cart.hasIssues && <Alert severity="error">Please resolve the highlighted items to continue.</Alert>}
          <Button component={Link} href={checkoutHref} variant="contained" size="large" fullWidth disabled={cart.hasIssues}>Proceed to checkout</Button>
          <Button component={Link} href="/products" variant="text" fullWidth>Continue shopping</Button>
        </OrderSummary>
      </Box>
    </Box>
  );
}
