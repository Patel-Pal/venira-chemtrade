'use client';
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAddresses } from '@/hooks/useAccount';
import { useCartPricing } from '@/hooks/useCart';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import AddressForm from '@/components/forms/AddressForm';
import OrderSummary from '@/components/cart/OrderSummary';
import { CouponBox } from '@/components/cart/CartView';
import { EmptyState, ErrorNote } from '@/components/common/ui';
import { ApiError, patch, post } from '@/lib/api-client';
import { qk } from '@/lib/query-keys';
import { openRazorpay } from '@/lib/razorpay-client';
import { formatPaise } from '@/utils/money';
import { brand } from '@/theme/tokens';
import type { Address } from '@/types/domain';

const STEPS = ['Customer', 'Delivery', 'Shipping', 'Review', 'Payment'];
interface CheckoutResult { orderId: string; orderNumber: string; razorpayOrderId: string; amountPaise: number; currency: string; keyId: string; customer: { name: string; email: string; phone?: string } }

const Card = ({ children, title }: { children: React.ReactNode; title: string }) => (
  <Box sx={{ bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 5, p: { xs: 2, md: 3 }, display: 'grid', gap: 2 }}>
    <Typography variant="h5" component="h2">{title}</Typography>
    {children}
  </Box>
);

export default function CheckoutFlow() {
  const router = useRouter();
  const qc = useQueryClient();
  const notify = useUiStore((s) => s.notify);
  const { user, status } = useAuthStore();
  const [step, setStep] = useState(0);
  const [shipId, setShipId] = useState<string | undefined>();
  const [addrId, setAddrId] = useState<string>('');
  const [billId, setBillId] = useState<string>('');
  const [sameBilling, setSameBilling] = useState(true);
  const [adding, setAdding] = useState(false);
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const idemKey = useRef<string>('');

  const { data: cart, isLoading, error: cartError, refetch, items, hydrated } = useCartPricing(shipId);
  const { data: addresses = [], isLoading: addrLoading } = useAddresses(status === 'authenticated');
  const effectiveShip = shipId ?? cart?.shippingMethodId;
  const shippingAddress = addresses.find((a) => a.id === (addrId || addresses.find((x) => x.isDefaultShipping)?.id || addresses[0]?.id));
  const billingAddress = sameBilling ? shippingAddress : addresses.find((a) => a.id === (billId || addresses.find((x) => x.isDefaultBilling)?.id));
  const needsPhone = !user?.phone;
  const customerOk = Boolean(user?.emailVerified) && (!needsPhone || phone.replace(/\D/g, '').length >= 8);
  const canNext = [customerOk, Boolean(shippingAddress) && Boolean(billingAddress), Boolean(effectiveShip), true, true][step];

  const clearTotals = useMemo(() => cart?.totals.totalPaise ?? 0, [cart]);

  if (!hydrated || (isLoading && items.length) || status === 'loading') return <Skeleton variant="rounded" height={320} sx={{ borderRadius: 5 }} />;
  if (items.length === 0 || (cart && cart.lines.length === 0)) return <EmptyState title="Your cart is empty" body="Add some items before checking out." action={{ label: 'Browse ingredients', href: '/products' }} />;
  if (cartError && !cart) return <ErrorNote error={cartError} onRetry={() => refetch()} />;
  if (!cart) return null;

  const savePhone = async () => {
    if (!needsPhone) return true;
    try {
      const u = await patch<{ name: string; phone?: string }>('/api/users/me', { name: user!.name, phone });
      useAuthStore.setState((s) => ({ user: s.user ? { ...s.user, phone: u.phone } : s.user }));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save phone number');
      return false;
    }
  };

  const next = async () => {
    setError('');
    if (step === 0 && !(await savePhone())) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pay = async () => {
    setBusy(true);
    setError('');
    try {
      // One idempotency key per attempt-with-this-cart: double clicks / retries never create duplicate orders.
      idemKey.current ||= crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);
      const co = await post<CheckoutResult>('/api/checkout', {
        items, shippingAddressId: shippingAddress!.id, billingAddressId: billingAddress?.id, shippingMethodId: effectiveShip,
        couponCode: useCartStore.getState().couponCode || undefined, notes: notes || undefined, idempotencyKey: idemKey.current,
      });
      const result = await openRazorpay({
        key: co.keyId, amount: co.amountPaise, currency: co.currency, name: 'Venira Chemtrade', description: `Order ${co.orderNumber}`, order_id: co.razorpayOrderId,
        image: `${window.location.origin}/images/logo-mark.png`,
        prefill: { name: co.customer.name, email: co.customer.email, contact: co.customer.phone }, theme: { color: brand.navy },
      });
      if (result.status === 'success') {
        const v = await post<{ status: 'paid' | 'processing'; orderId: string }>('/api/payments/verify', result.response);
        useCartStore.getState().clear();
        qc.invalidateQueries({ queryKey: qk.orders.all });
        router.replace(`/orders/${v.orderId}?placed=${v.status}`);
      } else if (result.status === 'failed') {
        idemKey.current = ''; // allow a fresh attempt
        setError(`${result.message}. You can try again - your items are still reserved for a short time.`);
        router.replace(`/orders/${co.orderId}?placed=failed`);
      } else {
        notify('Payment window closed. You can complete payment from your order page.', 'info');
        router.replace(`/orders/${co.orderId}?placed=pending`);
      }
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'CART_INVALID' || e.code === 'INSUFFICIENT_STOCK')) { refetch(); setStep(3); }
      idemKey.current = '';
      setError(e instanceof Error ? e.message : 'Payment could not be started');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Stepper activeStep={step} alternativeLabel sx={{ mb: { xs: 3, md: 4 }, '& .MuiStepLabel-label': { fontSize: { xs: '0.7rem', md: '0.85rem' } } }}>
        {STEPS.map((s) => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
      </Stepper>

      <Box sx={{ display: 'grid', gap: { xs: 3, md: 4 }, gridTemplateColumns: { xs: '1fr', md: '1.5fr 1fr' }, alignItems: 'start' }}>
        <Box sx={{ display: 'grid', gap: 2 }}>
          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

          {step === 0 && (
            <Card title="Customer information">
              <Typography>{user?.name}</Typography>
              <Typography color="text.secondary">{user?.email}</Typography>
              {!user?.emailVerified && <Alert severity="warning">Please verify your email address (check your inbox) before placing an order.</Alert>}
              {needsPhone ? <TextField label="Mobile number (for delivery updates)" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /> : <Typography variant="body2" color="text.secondary">Mobile: {user?.phone}</Typography>}
            </Card>
          )}

          {step === 1 && (
            <Card title="Delivery address">
              {addrLoading ? <Skeleton height={120} /> : addresses.length > 0 && !adding && (
                <RadioGroup value={shippingAddress?.id ?? ''} onChange={(e) => setAddrId(e.target.value)} aria-label="Shipping address">
                  {addresses.map((a) => <AddressOption key={a.id} a={a} />)}
                </RadioGroup>
              )}
              {adding || addresses.length === 0 ? (
                <AddressForm onSaved={(a) => { qc.invalidateQueries({ queryKey: qk.addresses }); setAddrId(a.id); setAdding(false); }} onCancel={addresses.length ? () => setAdding(false) : undefined} />
              ) : <Button onClick={() => setAdding(true)} sx={{ justifySelf: 'start' }}>+ Add a new address</Button>}
              {addresses.length > 0 && !adding && (
                <>
                  <FormControlLabel control={<Checkbox checked={sameBilling} onChange={(e) => setSameBilling(e.target.checked)} />} label="Billing address is the same as shipping" />
                  {!sameBilling && (
                    <RadioGroup value={billingAddress?.id ?? ''} onChange={(e) => setBillId(e.target.value)} aria-label="Billing address">
                      {addresses.map((a) => <AddressOption key={a.id} a={a} />)}
                    </RadioGroup>
                  )}
                </>
              )}
            </Card>
          )}

          {step === 2 && (
            <Card title="Shipping method">
              <RadioGroup value={effectiveShip ?? ''} onChange={(e) => setShipId(e.target.value)} aria-label="Shipping method">
                {cart.shippingMethods.map((m) => (
                  <FormControlLabel key={m.id} value={m.id} control={<Radio />} sx={{ m: 0, mb: 1, p: 1.5, border: `1px solid ${m.id === effectiveShip ? brand.navy : brand.line}`, borderRadius: 3, alignItems: 'flex-start' }}
                    label={<Box><Typography sx={{ fontWeight: 700 }}>{m.name} · {m.pricePaise === 0 ? 'Free' : formatPaise(m.pricePaise)}</Typography>{m.description && <Typography variant="body2" color="text.secondary">{m.description}</Typography>}{m.estimatedDays && <Typography variant="caption" color="text.secondary">Delivery in {m.estimatedDays} days</Typography>}{m.freeAbovePaise ? <Typography variant="caption" display="block" color="success.dark">Free above {formatPaise(m.freeAbovePaise)}</Typography> : null}</Box>} />
                ))}
              </RadioGroup>
            </Card>
          )}

          {step === 3 && (
            <Card title="Review your order">
              {cart.lines.map((l) => (
                <Box key={l.variantId} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                  <Box><Typography sx={{ fontWeight: 600 }}>{l.name}</Typography><Typography variant="caption" color="text.secondary">{l.variantLabel} × {l.quantity}</Typography>{l.issue && <Typography variant="caption" color="error" display="block">{l.issue.replace(/_/g, ' ')}</Typography>}</Box>
                  <Typography sx={{ fontWeight: 700 }}>{formatPaise(l.lineTotalPaise)}</Typography>
                </Box>
              ))}
              <Box><Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>Coupon</Typography><CouponBox />{cart.couponError && <Alert severity="warning" sx={{ mt: 1 }}>{cart.couponError}</Alert>}</Box>
              <Box sx={{ display: 'grid', gap: 0.5 }}>
                <Typography variant="body2"><b>Ship to:</b> {shippingAddress && `${shippingAddress.fullName}, ${shippingAddress.line1}, ${shippingAddress.city} ${shippingAddress.postalCode}`}</Typography>
                {!sameBilling && billingAddress && <Typography variant="body2"><b>Bill to:</b> {`${billingAddress.fullName}, ${billingAddress.line1}, ${billingAddress.city}`}</Typography>}
              </Box>
              <TextField label="Order notes (optional)" multiline minRows={2} value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 500))} />
            </Card>
          )}

          {step === 4 && (
            <Card title="Payment">
              <Alert icon={<LockOutlinedIcon />} severity="info">You&apos;ll pay securely with Razorpay (UPI, cards, net banking, wallets). We never see or store your card details.</Alert>
              {cart.hasIssues && <Alert severity="error">Some items are no longer available. <Link href="/cart">Review your cart</Link>.</Alert>}
              <Button variant="contained" size="large" onClick={pay} disabled={busy || cart.hasIssues || !shippingAddress} startIcon={<LockOutlinedIcon />}>
                {busy ? 'Starting secure payment…' : `Pay ${formatPaise(clearTotals)}`}
              </Button>
            </Card>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Button disabled={step === 0 || busy} onClick={() => setStep((s) => s - 1)}>Back</Button>
            {step < STEPS.length - 1 && <Button variant="contained" size="large" onClick={next} disabled={!canNext || (step === 3 && cart.hasIssues)}>Continue</Button>}
          </Box>
        </Box>

        <Box sx={{ position: { md: 'sticky' }, top: { md: 100 } }}>
          <OrderSummary cart={cart} shippingLabel={cart.shippingMethods.find((m) => m.id === effectiveShip)?.name ? `Shipping (${cart.shippingMethods.find((m) => m.id === effectiveShip)!.name})` : 'Shipping'} />
        </Box>
      </Box>
    </Box>
  );
}

function AddressOption({ a }: { a: Address }) {
  return (
    <FormControlLabel value={a.id} control={<Radio />} sx={{ m: 0, mb: 1, p: 1.5, border: `1px solid ${brand.line}`, borderRadius: 3, alignItems: 'flex-start' }}
      label={<Box><Typography sx={{ fontWeight: 700 }}>{a.fullName}{a.label ? ` · ${a.label}` : ''}</Typography><Typography variant="body2" color="text.secondary">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.postalCode}</Typography><Typography variant="caption" color="text.secondary">{a.phone}</Typography></Box>} />
  );
}
