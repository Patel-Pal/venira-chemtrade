'use client';
import Link from 'next/link';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import CloseIcon from '@mui/icons-material/Close';
import { useUiStore } from '@/stores/ui.store';
import { useProductDetail } from '@/hooks/useCatalog';
import { useAddToCart } from '@/hooks/useCommerce';
import { Price, ErrorNote } from '@/components/common/ui';
import { ProductImage } from './ProductCard';

export default function QuickView() {
  const slug = useUiStore((s) => s.quickViewSlug);
  const close = () => useUiStore.getState().openQuickView(null);
  const { data: p, isLoading, error } = useProductDetail(slug);
  const add = useAddToCart();
  const buyable = p?.variants.find((v) => v.pricePaise !== null && v.inStock);

  return (
    <Dialog open={Boolean(slug)} onClose={close} maxWidth="md" fullWidth aria-labelledby="qv-title">
      <IconButton aria-label="Close quick view" onClick={close} sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, bgcolor: 'rgba(255,255,255,.9)' }}><CloseIcon /></IconButton>
      <DialogContent sx={{ p: 0 }}>
        {error ? <Box sx={{ p: 3 }}><ErrorNote error={error} /></Box> : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <Box sx={{ position: 'relative', aspectRatio: '1 / 1', bgcolor: 'background.default' }}>
              {isLoading || !p ? <Skeleton variant="rectangular" sx={{ position: 'absolute', inset: 0 }} /> : <ProductImage src={p.images[0]?.url} alt={p.name} sizes="(max-width:900px) 100vw, 450px" priority />}
            </Box>
            <Box sx={{ p: { xs: 2.5, md: 4 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {isLoading || !p ? <><Skeleton width="40%" /><Skeleton height={44} /><Skeleton height={90} /></> : (
                <>
                  {p.category && <Typography variant="overline" color="info.main">{p.category.name}</Typography>}
                  <Typography id="qv-title" variant="h3" component="h2" sx={{ fontSize: '1.6rem' }}>{p.name}</Typography>
                  <Price minPaise={p.minPricePaise} maxPaise={p.maxPricePaise} comparePaise={p.compareAtPaise} onRequest={p.priceOnRequest} size="lg" />
                  {p.shortDescription || p.description ? <Typography color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.shortDescription ?? p.description}</Typography> : (
                    <Typography color="text.secondary" variant="body2">Detailed specifications are available on request.</Typography>
                  )}
                  <Box sx={{ mt: 'auto', display: 'flex', gap: 1.5, flexWrap: 'wrap', pt: 1 }}>
                    {buyable ? (
                      <Button variant="contained" size="large" onClick={() => { add(buyable.id, 1, p.name); close(); }} sx={{ flex: 1 }}>Add to cart</Button>
                    ) : (
                      <Button variant="contained" size="large" component={Link} href={`/contact?product=${encodeURIComponent(p.name)}`} onClick={close} sx={{ flex: 1 }}>Request a quote</Button>
                    )}
                    <Button variant="outlined" size="large" component={Link} href={`/products/${p.slug}`} onClick={close}>View details</Button>
                  </Box>
                </>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
