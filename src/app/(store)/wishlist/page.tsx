'use client';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useWishlistStore } from '@/stores/wishlist.store';
import { useProductsByIds } from '@/hooks/useCatalog';
import { EmptyState, ErrorNote, ProductGridSkeleton } from '@/components/common/ui';
import { ProductGrid } from '@/components/products/ProductCard';
import { useEffect, useState } from 'react';

export default function WishlistPage() {
  const ids = useWishlistStore((s) => s.productIds);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data, isLoading, error, refetch } = useProductsByIds(mounted ? ids : []);
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 5 } }}>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.8rem', md: '2.4rem' }, mb: 3 }}>Wishlist</Typography>
      {!mounted || (isLoading && ids.length > 0) ? <ProductGridSkeleton count={4} /> : error ? <ErrorNote error={error} onRetry={() => refetch()} /> : ids.length === 0 || !data?.length ? (
        <EmptyState icon={<FavoriteBorderIcon fontSize="large" />} title="Your wishlist is empty" body="Tap the heart on any item to save it for later." action={{ label: 'Explore ingredients', href: '/products' }} />
      ) : <ProductGrid products={data} />}
    </Container>
  );
}
