import type { Metadata } from 'next';
import Container from '@mui/material/Container';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import { PageTitle } from '@/components/common/ui';
import CartView from '@/components/cart/CartView';

export const metadata: Metadata = { title: 'Your cart', robots: { index: false } };

export default function CartPage() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 5 } }}>
      <PageTitle title="Shopping cart" subtitle="Review your items before checkout." icon={<ShoppingBagOutlinedIcon />} />
      <CartView />
    </Container>
  );
}
