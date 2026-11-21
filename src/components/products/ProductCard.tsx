'use client';
import Link from 'next/link';
import Image from 'next/image';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCartOutlined';
import { motion, useReducedMotion } from 'framer-motion';
import type { ProductCardDTO } from '@/modules/products/catalog.service';
import { Price, Stars } from '@/components/common/ui';
import { useAddToCart, useWishlist } from '@/hooks/useCommerce';
import { useUiStore } from '@/stores/ui.store';
import { optimizedImage } from '@/utils/image';
import { brand, shadows } from '@/theme/tokens';

export function ProductImage({ src, alt, sizes, priority }: { src?: string; alt: string; sizes: string; priority?: boolean }) {
  const url = optimizedImage(src, 640);
  if (!url) {
    // Clearly-marked placeholder: no product photo has been supplied yet.
    return (
      <Box aria-label={`${alt} - image pending`} role="img" sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: `linear-gradient(145deg, ${brand.skyLight}, #fff 55%, ${brand.greenLight})` }}>
        <Image src="/images/logo-mark.png" alt="" width={84} height={77} style={{ opacity: 0.35, width: '34%', height: 'auto' }} />
      </Box>
    );
  }
  return <Image src={url} alt={alt} fill sizes={sizes} priority={priority} style={{ objectFit: 'cover' }} />;
}

export default function ProductCard({ product, priority = false }: { product: ProductCardDTO; priority?: boolean }) {
  const reduce = useReducedMotion();
  const { inWishlist, toggle } = useWishlist(product.id);
  const addToCart = useAddToCart();
  const openQuickView = useUiStore((s) => s.openQuickView);
  const canBuy = !product.priceOnRequest && product.inStock && product.firstVariantId;

  return (
    <motion.article
      whileHover={reduce ? undefined : { y: -4 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      style={{ position: 'relative', height: '100%' }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fff', borderRadius: 5, border: `1px solid ${brand.line}`, overflow: 'hidden', boxShadow: shadows.soft, transition: 'box-shadow .25s, border-color .25s', '&:hover': { boxShadow: shadows.lift, borderColor: `${brand.sky}88` }, '&:hover .qv': { opacity: 1 }, '& .pimg img': { transition: 'transform .5s ease' }, '&:hover .pimg img': { transform: 'scale(1.06)' } }}>
        <Box className="pimg" sx={{ position: 'relative', aspectRatio: '1 / 1', bgcolor: brand.canvas, overflow: 'hidden', borderBottom: `1px solid ${brand.line}` }}>
          <Link href={`/products/${product.slug}`} aria-label={product.name} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
          <ProductImage src={product.image?.url} alt={product.image?.alt ?? product.name} priority={priority} sizes="(max-width:600px) 50vw, (max-width:1200px) 33vw, 25vw" />
          <Box sx={{ position: 'absolute', top: 10, left: 10, zIndex: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap', pointerEvents: 'none' }}>
            {product.badges.slice(0, 2).map((b) => (
              <Chip key={b} label={b} size="small" sx={{ background: b === 'Offer' ? `linear-gradient(135deg, ${brand.green}, ${brand.greenDark})` : `linear-gradient(135deg, ${brand.navy}, ${brand.navyDark})`, color: '#fff', height: 24, fontSize: '0.7rem', boxShadow: '0 2px 6px rgba(16,36,63,.2)' }} />
            ))}
          </Box>
          <IconButton
            onClick={toggle}
            aria-label={inWishlist ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            aria-pressed={inWishlist}
            sx={{ position: 'absolute', top: 6, right: 6, zIndex: 2, bgcolor: 'rgba(255,255,255,.92)', '&:hover': { bgcolor: '#fff' } }}
          >
            {inWishlist ? <FavoriteIcon sx={{ color: '#d6336c' }} /> : <FavoriteBorderIcon />}
          </IconButton>
          <IconButton
            className="qv"
            onClick={() => openQuickView(product.slug)}
            aria-label={`Quick view ${product.name}`}
            sx={{ position: 'absolute', bottom: 8, right: 6, zIndex: 2, bgcolor: 'rgba(255,255,255,.95)', opacity: { xs: 1, md: 0 }, transition: 'opacity .2s', display: { xs: 'none', md: 'inline-flex' } }}
          >
            <VisibilityOutlinedIcon />
          </IconButton>
        </Box>
        <Box sx={{ p: { xs: 1.5, md: 2 }, display: 'flex', flexDirection: 'column', gap: 0.75, flex: 1 }}>
          {product.category && <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: '0.68rem' }}>{product.category.name}</Typography>}
          <Typography component="h3" sx={{ fontWeight: 700, fontSize: { xs: '0.92rem', md: '1rem' }, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.6em' }}>
            {product.name}
          </Typography>
          <Stars value={product.ratingAverage} count={product.ratingCount} />
          <Box sx={{ mt: 'auto', pt: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
            <Price minPaise={product.minPricePaise} maxPaise={product.maxPricePaise} comparePaise={product.compareAtPaise} onRequest={product.priceOnRequest} size="sm" />
          </Box>
          {canBuy ? (
            <Button variant="contained" size="small" startIcon={<AddShoppingCartIcon />} onClick={() => addToCart(product.firstVariantId!, 1, product.name)} sx={{ mt: 1 }} fullWidth>
              Add to cart
            </Button>
          ) : product.priceOnRequest ? (
            <Button variant="outlined" size="small" component={Link} href={`/contact?product=${encodeURIComponent(product.name)}`} sx={{ mt: 1 }} fullWidth>
              Request a quote
            </Button>
          ) : (
            <Button variant="outlined" size="small" disabled sx={{ mt: 1 }} fullWidth>Out of stock</Button>
          )}
        </Box>
      </Box>
    </motion.article>
  );
}

export function ProductGrid({ products }: { products: ProductCardDTO[] }) {
  return (
    <Box sx={{ display: 'grid', gap: { xs: 1.5, md: 3 }, gridTemplateColumns: { xs: 'repeat(2, minmax(0,1fr))', md: 'repeat(3, minmax(0,1fr))', lg: 'repeat(4, minmax(0,1fr))' } }}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </Box>
  );
}
