import type { Metadata } from 'next';
import Container from '@mui/material/Container';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { PageTitle } from '@/components/common/ui';
import CheckoutFlow from '@/components/checkout/CheckoutFlow';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

export default function CheckoutPage() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 5 } }}>
      <PageTitle title="Checkout" subtitle="Secure checkout powered by Razorpay." icon={<LockOutlinedIcon />} />
      <CheckoutFlow />
    </Container>
  );
}
