import type { Metadata } from 'next';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CartView from '@/components/cart/CartView';

export const metadata: Metadata = { title: 'Your cart', robots: { index: false } };

export default function CartPage() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 5 } }}>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.8rem', md: '2.4rem' }, mb: 3 }}>Shopping cart</Typography>
      <CartView />
    </Container>
  );
}
