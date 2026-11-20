'use client';
import Box from '@mui/material/Box';
import type { ProductCardDTO } from '@/modules/products/catalog.service';
import ProductCard from './ProductCard';
import { Stagger, StaggerItem } from '@/components/animations/Reveal';

/** Swipeable rail on mobile (native-app feel), responsive grid on desktop. */
export default function ProductRail({ products }: { products: ProductCardDTO[] }) {
  return (
    <Stagger>
      <Box
        sx={{
          display: { xs: 'flex', md: 'grid' }, gap: { xs: 1.5, md: 3 }, gridTemplateColumns: { md: 'repeat(4, minmax(0,1fr))' },
          overflowX: { xs: 'auto', md: 'visible' }, scrollSnapType: { xs: 'x mandatory', md: 'none' }, mx: { xs: -2, md: 0 }, px: { xs: 2, md: 0 }, pb: { xs: 1.5, md: 0 },
          scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {products.slice(0, 8).map((p, i) => (
          <Box key={p.id} sx={{ flex: { xs: '0 0 62%', sm: '0 0 40%', md: 'initial' }, scrollSnapAlign: 'start', minWidth: 0, display: i >= 4 ? { xs: 'block', md: 'none' } : 'block' }}>
            <StaggerItem style={{ height: '100%' }}>
              <ProductCard product={p} />
            </StaggerItem>
          </Box>
        ))}
      </Box>
    </Stagger>
  );
}
