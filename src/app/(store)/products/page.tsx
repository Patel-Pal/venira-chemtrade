import { Suspense } from 'react';
import type { Metadata } from 'next';
import Container from '@mui/material/Container';
import ProductListing from '@/components/products/ProductListing';
import { ProductGridSkeleton } from '@/components/common/ui';

export const metadata: Metadata = {
  title: 'Shop ingredients',
  description: 'Browse cosmetic ingredients: emulsifiers, actives, surfactants, silicones, UV filters, oils, butters and extracts.',
  alternates: { canonical: '/products' },
};

export default function ProductsPage() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 5 } }}>
      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductListing />
      </Suspense>
    </Container>
  );
}
