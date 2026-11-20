import { Suspense } from 'react';
import type { Metadata } from 'next';
import Container from '@mui/material/Container';
import OrderDetailView from '@/components/account/OrderDetailView';

export const metadata: Metadata = { title: 'Order details', robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 5 } }}>
      <Suspense><OrderDetailView id={id} /></Suspense>
    </Container>
  );
}
