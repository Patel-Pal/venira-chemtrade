'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Alert from '@mui/material/Alert';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import type { ProductCardDTO, ProductDetailDTO } from '@/modules/products/catalog.service';
import { Price, QuantityStepper, Stars } from '@/components/common/ui';
import { ProductImage } from './ProductCard';
import ProductReviews from './ProductReviews';
import ProductRail from './ProductRail';
import { useAddToCart, useWishlist } from '@/hooks/useCommerce';
import { useProductsByIds } from '@/hooks/useCatalog';
import { useRecentlyViewedStore } from '@/stores/recently-viewed.store';
import { useCartStore } from '@/stores/cart.store';
import { useUiStore } from '@/stores/ui.store';
import { optimizedImage } from '@/utils/image';
import { formatPaise } from '@/utils/money';
import { brand, shadows } from '@/theme/tokens';

export default function ProductDetailView({ product, related, reviewsEnabled }: { product: ProductDetailDTO; related: ProductCardDTO[]; reviewsEnabled: boolean }) {
  const router = useRouter();
  const addToCart = useAddToCart();
  const notify = useUiStore((s) => s.notify);
  const { inWishlist, toggle } = useWishlist(product.id);
  const pushRecent = useRecentlyViewedStore((s) => s.push);
  const recentIds = useRecentlyViewedStore((s) => s.productIds);
  const [recentMounted, setRecentMounted] = useState(false);

  const [variantId, setVariantId] = useState(() => (product.variants.find((v) => v.inStock && v.pricePaise !== null) ?? product.variants[0])?.id);
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const variant = product.variants.find((v) => v.id === variantId);
  const maxQty = variant?.available ?? 10_000;

  useEffect(() => { pushRecent(product.id); setRecentMounted(true); }, [product.id, pushRecent]);
  const recentOthers = useMemo(() => recentIds.filter((i) => i !== product.id).slice(0, 8), [recentIds, product.id]);
  const { data: recent = [] } = useProductsByIds(recentMounted ? recentOthers : []);

  const onRequest = !variant || variant.pricePaise === null;
  const outOfStock = variant ? !variant.inStock : true;
  const canBuy = Boolean(variant) && !onRequest && !outOfStock;

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else { await navigator.clipboard.writeText(url); notify('Link copied', 'info'); }
    } catch { /* cancelled */ }
  };
  const buyNow = () => { if (!variant) return; useCartStore.getState().add(variant.id, qty); router.push('/checkout'); };

  const infoSections = [
    product.description && { key: 'desc', title: 'Description', body: <Typography sx={{ whiteSpace: 'pre-line' }}>{product.description}</Typography> },
    product.benefits.length > 0 && { key: 'ben', title: 'Benefits', body: <Box component="ul" sx={{ m: 0, pl: 2.5 }}>{product.benefits.map((b) => <li key={b}><Typography>{b}</Typography></li>)}</Box> },
    product.ingredients.length > 0 && { key: 'ing', title: 'Ingredients', body: <Typography>{product.ingredients.join(', ')}</Typography> },
    product.howToUse && { key: 'use', title: 'How to use', body: <Typography sx={{ whiteSpace: 'pre-line' }}>{product.howToUse}</Typography> },
    product.specifications.length > 0 && { key: 'spec', title: 'Specifications', body: <Table size="small"><TableBody>{product.specifications.map((s) => <TableRow key={s.label}><TableCell sx={{ fontWeight: 700, width: '40%' }}>{s.label}</TableCell><TableCell>{s.value}</TableCell></TableRow>)}</TableBody></Table> },
  ].filter(Boolean) as { key: string; title: string; body: React.ReactNode }[];

  const images = product.images;

  return (
    <Box sx={{ pb: { xs: 10, md: 0 } }}>
      <Breadcrumbs aria-label="Breadcrumb" sx={{ mb: 2.5, fontSize: '0.85rem', '& a': { textDecoration: 'none', color: 'text.secondary', '&:hover': { color: 'primary.main', textDecoration: 'underline' } } }}>
        <Link href="/">Home</Link>
        <Link href="/products">Shop</Link>
        {product.category && <Link href={`/products?category=${product.category.slug}`}>{product.category.name}</Link>}
        <Typography color="text.primary" sx={{ fontSize: 'inherit' }}>{product.name}</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'grid', gap: { xs: 3, md: 6 }, gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' }, alignItems: 'start' }}>
        {/* gallery */}
        <Box sx={{ position: { md: 'sticky' }, top: { md: 100 } }}>
          <Box sx={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 6, overflow: 'hidden', bgcolor: brand.canvas, border: `1px solid ${brand.line}`, boxShadow: shadows.lift }}>
            <ProductImage src={images[imgIdx]?.url} alt={images[imgIdx]?.alt ?? product.name} sizes="(max-width:900px) 100vw, 600px" priority />
            {images.length === 0 && <Chip size="small" label="Product image coming soon" sx={{ position: 'absolute', bottom: 12, left: 12, bgcolor: 'rgba(255,255,255,.9)' }} />}
          </Box>
          {images.length > 1 && (
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, overflowX: 'auto', pb: 0.5 }} role="listbox" aria-label="Product images">
              {images.map((im, i) => (
                <Box key={im.id} component="button" role="option" aria-selected={i === imgIdx} aria-label={`Image ${i + 1}`} onClick={() => setImgIdx(i)} sx={{ position: 'relative', flex: '0 0 72px', height: 72, borderRadius: 3, overflow: 'hidden', border: `2px solid ${i === imgIdx ? brand.navy : brand.line}`, opacity: i === imgIdx ? 1 : 0.75, transition: 'all .2s', '&:hover': { opacity: 1, borderColor: brand.sky }, p: 0, cursor: 'pointer', bgcolor: brand.canvas }}>
                  <Image src={optimizedImage(im.url, 160) ?? im.url} alt="" fill sizes="72px" style={{ objectFit: 'cover' }} />
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* buy box */}
        <Box>
          {product.category && <Chip size="small" label={product.category.name} component={Link} href={`/products?category=${product.category.slug}`} clickable sx={{ bgcolor: brand.skyLight, color: brand.navy, fontWeight: 700 }} />}
          <Typography variant="h1" component="h1" sx={{ fontSize: { xs: '1.9rem', md: '2.6rem' }, mt: 1, color: 'primary.dark' }}>{product.name}</Typography>
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Stars value={product.ratingAverage} count={product.ratingCount} size="medium" />
            {variant && <Typography variant="caption" color="text.secondary">SKU: {variant.sku}</Typography>}
          </Box>
          {product.shortDescription && <Typography sx={{ mt: 2 }} color="text.secondary">{product.shortDescription}</Typography>}

          <Box sx={{ mt: 3, p: 2.5, borderRadius: 4, border: `1px solid ${brand.line}`, background: `linear-gradient(135deg, ${brand.skyLight}88, #fff 60%)` }}>
            {variant ? <Price minPaise={variant.pricePaise} comparePaise={variant.compareAtPricePaise} onRequest={variant.pricePaise === null} size="lg" /> : <Price minPaise={null} onRequest />}
            {variant && variant.pricePaise !== null && variant.compareAtPricePaise && variant.compareAtPricePaise > variant.pricePaise && (
              <Chip size="small" color="secondary" label={`Save ${formatPaise(variant.compareAtPricePaise - variant.pricePaise)}`} sx={{ mt: 1 }} />
            )}
          </Box>

          {product.variants.length > 1 && (
            <Box sx={{ mt: 3 }} role="radiogroup" aria-label="Select size">
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'text.primary' }}>Size / variant</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {product.variants.map((v) => (
                  <Chip key={v.id} role="radio" aria-checked={v.id === variantId} label={v.label} clickable onClick={() => { setVariantId(v.id); setQty(1); }} variant={v.id === variantId ? 'filled' : 'outlined'} color={v.id === variantId ? 'primary' : 'default'} disabled={!v.inStock && v.trackInventory} sx={{ height: 40, px: 1, fontSize: '0.9rem' }} />
                ))}
              </Box>
            </Box>
          )}

          {variant && variant.trackInventory && (
            <Typography variant="body2" sx={{ mt: 2, fontWeight: 600, color: variant.inStock ? (variant.available! <= 10 ? 'warning.dark' : 'success.dark') : 'error.main' }}>
              {variant.inStock ? (variant.available! <= 10 ? `Only ${variant.available} left in stock` : 'In stock') : 'Out of stock'}
            </Typography>
          )}

          {onRequest ? (
            <Alert severity="info" icon={false} sx={{ mt: 3, borderRadius: 3 }}>
              Pricing, pack sizes and availability for this ingredient are shared on request.
              <Box sx={{ mt: 1.5 }}>
                <Button variant="contained" component={Link} href={`/contact?product=${encodeURIComponent(product.name)}`}>Request a quote</Button>
              </Box>
            </Alert>
          ) : (
            <Box sx={{ mt: 3, display: { xs: 'none', md: 'flex' }, gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              <QuantityStepper value={qty} onChange={setQty} max={maxQty} />
              <Button variant="contained" size="large" disabled={!canBuy} onClick={() => variant && addToCart(variant.id, qty, product.name)} sx={{ flex: 1, minWidth: 160 }}>Add to cart</Button>
              <Button variant="outlined" size="large" disabled={!canBuy} onClick={buyNow}>Buy now</Button>
            </Box>
          )}
          <Box sx={{ mt: 2.5, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1 }}>
            {[{ icon: <VerifiedOutlinedIcon fontSize="small" />, label: 'Quality assured' }, { icon: <LocalShippingOutlinedIcon fontSize="small" />, label: 'Reliable delivery' }, { icon: <SupportAgentOutlinedIcon fontSize="small" />, label: 'Expert support' }].map((t) => (
              <Box key={t.label} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, borderRadius: 3, bgcolor: brand.greenLight, color: brand.greenDark, fontSize: '0.82rem', fontWeight: 600 }}>{t.icon}{t.label}</Box>
            ))}
          </Box>
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button startIcon={inWishlist ? <FavoriteIcon sx={{ color: '#d6336c' }} /> : <FavoriteBorderIcon />} onClick={toggle} aria-pressed={inWishlist}>{inWishlist ? 'Saved' : 'Save to wishlist'}</Button>
            <IconButton aria-label="Share" onClick={share}><ShareOutlinedIcon /></IconButton>
          </Box>

          <Box sx={{ mt: 4 }}>
            {infoSections.map((s, i) => (
              <Accordion key={s.key} defaultExpanded={i === 0} disableGutters elevation={0} sx={{ border: `1px solid ${brand.line}`, '&:not(:last-child)': { borderBottom: 0 }, '&:first-of-type': { borderTopLeftRadius: 16, borderTopRightRadius: 16 }, '&:last-of-type': { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }, '&::before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography sx={{ fontWeight: 700 }}>{s.title}</Typography></AccordionSummary>
                <AccordionDetails>{s.body}</AccordionDetails>
              </Accordion>
            ))}
            {infoSections.length === 0 && (
              <Alert severity="info" sx={{ borderRadius: 3 }}>Detailed description, specifications and usage information are available on request from our team.</Alert>
            )}
          </Box>
        </Box>
      </Box>

      {reviewsEnabled && <Box sx={{ mt: { xs: 6, md: 10 } }}><ProductReviews slug={product.slug} /></Box>}

      {related.length > 0 && (
        <Box sx={{ mt: { xs: 6, md: 10 } }}>
          <Typography variant="h3" component="h2" sx={{ mb: 3 }}>You may also like</Typography>
          <ProductRail products={related} />
        </Box>
      )}
      {recent.length > 0 && (
        <Box sx={{ mt: { xs: 6, md: 8 } }}>
          <Typography variant="h3" component="h2" sx={{ mb: 3 }}>Recently viewed</Typography>
          <ProductRail products={recent} />
        </Box>
      )}

      {/* Sticky mobile purchase bar, sits above the bottom navigation */}
      {!onRequest && (
        <Box sx={{ display: { xs: 'flex', md: 'none' }, position: 'fixed', left: 0, right: 0, bottom: 'calc(64px + env(safe-area-inset-bottom))', zIndex: 1090, gap: 1, p: 1.5, bgcolor: 'rgba(255,255,255,.97)', borderTop: `1px solid ${brand.line}`, backdropFilter: 'blur(8px)' }}>
          <QuantityStepper value={qty} onChange={setQty} max={maxQty} size="sm" />
          <Button variant="contained" size="large" fullWidth disabled={!canBuy} onClick={() => variant && addToCart(variant.id, qty, product.name)}>
            {canBuy ? `Add · ${formatPaise((variant?.pricePaise ?? 0) * qty)}` : outOfStock ? 'Out of stock' : 'Unavailable'}
          </Button>
        </Box>
      )}
    </Box>
  );
}
