import Link from 'next/link';
import Image from 'next/image';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Rating from '@mui/material/Rating';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import Hero from '@/components/home/Hero';
import { TrustStrip, HowItWorks, QuoteCta } from '@/components/home/HomeSections';
import ProductRail from '@/components/products/ProductRail';
import { Reveal, Stagger, StaggerItem } from '@/components/animations/Reveal';
import { SectionHeader } from '@/components/common/ui';
import NewsletterForm from '@/components/navigation/NewsletterForm';
import { getHomeData } from '@/modules/products/home.service';
import { getPublicSettings } from '@/modules/settings/public-settings';
import { brand, shadows } from '@/theme/tokens';
import { optimizedImage } from '@/utils/image';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [home, settings] = await Promise.all([getHomeData(), getPublicSettings()]);
  const heroBanner = home.banners.find((b) => b.placement === 'hero');
  const promos = home.banners.filter((b) => b.placement === 'promo').slice(0, 2);
  const topCats = home.categories.filter((c) => !c.parentId && c.productCount > 0);

  const stats = [
    home.totalProducts ? { value: `${home.totalProducts}+`, label: 'Ingredients listed' } : null,
    topCats.length ? { value: String(topCats.length), label: 'Categories' } : null,
  ].filter(Boolean) as { value: string; label: string }[];

  const sections: { key: string; eyebrow: string; title: string; subtitle?: string; products: typeof home.latest }[] = [
    { key: 'best', eyebrow: 'Customer favourites', title: 'Best sellers', products: home.bestSellers },
    { key: 'new', eyebrow: 'Just in', title: 'New arrivals', products: home.newArrivals },
    { key: 'rec', eyebrow: 'Hand-picked', title: 'Recommended for you', products: home.featured },
  ].filter((s) => s.products.length > 0);
  // Fallback so the page is never empty while the owner has not flagged any products.
  if (sections.length === 0 && home.latest.length) sections.push({ key: 'latest', eyebrow: 'Explore the range', title: 'Latest ingredients', subtitle: 'Browse what we supply. Prices are shared on request.', products: home.latest });

  return (
    <>
      <Hero
        eyebrow={settings.hero.eyebrow ?? settings.storeName}
        heading={heroBanner?.title ?? settings.hero.heading ?? 'The power behind the beauty products'}
        subheading={heroBanner?.subtitle ?? settings.hero.subheading}
        ctaLabel={heroBanner?.ctaLabel ?? settings.hero.ctaLabel}
        ctaUrl={heroBanner?.ctaUrl ?? settings.hero.ctaUrl}
        imageUrl={heroBanner?.imageUrl}
        stats={stats}
      />

      <TrustStrip />

      {topCats.length > 0 && (
        <Container maxWidth="lg" sx={{ mt: { xs: 6, md: 10 } }}>
          <Reveal>
            <SectionHeader eyebrow="Shop by category" title="Featured categories" action={{ label: 'All categories', href: '/categories' }} />
          </Reveal>
          <Stagger>
            <Box sx={{ display: 'grid', gap: { xs: 1.5, md: 2.5 }, gridTemplateColumns: { xs: 'repeat(2, minmax(0,1fr))', sm: 'repeat(3, minmax(0,1fr))', md: 'repeat(4, minmax(0,1fr))' } }}>
              {topCats.slice(0, 8).map((c, i) => (
                <StaggerItem key={c.id}>
                  <Box component={Link} href={`/products?category=${c.slug}`} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden', minHeight: { xs: 150, md: 200 }, p: { xs: 2, md: 3 }, borderRadius: 6, textDecoration: 'none', color: c.image?.url || i % 3 === 0 ? '#fff' : 'text.primary', background: i % 3 === 0 ? `linear-gradient(135deg, ${brand.navy}, ${brand.navyDark})` : i % 3 === 1 ? brand.skyLight : brand.greenLight, border: `1px solid ${brand.line}`, boxShadow: shadows.soft, transition: 'transform .25s, box-shadow .25s', '& .cat-hex': { transition: 'transform .5s ease' }, '& .cat-arrow': { opacity: 0, transform: 'translateX(-6px)', transition: 'all .25s' }, '&:hover': { transform: 'translateY(-6px)', boxShadow: shadows.lift, '& .cat-hex': { transform: 'scale(1.15) rotate(12deg)' }, '& .cat-arrow': { opacity: 1, transform: 'none' } } }}>
                    {c.image?.url && (<><Image src={optimizedImage(c.image.url, 700) ?? c.image.url} alt="" fill sizes="(max-width:600px) 50vw, 300px" style={{ objectFit: 'cover' }} /><Box aria-hidden sx={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(16,36,63,.15) 0%, rgba(16,36,63,.82) 100%)` }} /></>)}
                    <Box className="cat-hex" aria-hidden component="svg" viewBox="0 0 100 100" sx={{ position: 'absolute', right: -18, bottom: -18, width: { xs: 96, md: 140 }, height: { xs: 96, md: 140 }, opacity: 0.18 }}><polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" /><polygon points="50,28 71,40 71,64 50,76 29,64 29,40" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" /></Box>
                    <Box sx={{ position: 'relative', width: 44, height: 44, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: i % 3 === 0 ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.85)', color: i % 3 === 0 ? '#fff' : i % 3 === 1 ? brand.navy : brand.greenDark }}>
                      <ScienceOutlinedIcon />
                    </Box>
                    <Box sx={{ position: 'relative' }}>
                      <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.98rem', md: '1.1rem' }, lineHeight: 1.25 }}>{c.name}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.25 }}>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>{c.productCount} items</Typography>
                        <ArrowForwardIcon className="cat-arrow" fontSize="small" />
                      </Box>
                    </Box>
                  </Box>
                </StaggerItem>
              ))}
            </Box>
          </Stagger>
        </Container>
      )}

      {sections.map((s) => (
        <Container key={s.key} maxWidth="lg" sx={{ mt: { xs: 6, md: 10 } }}>
          <Reveal>
            <SectionHeader eyebrow={s.eyebrow} title={s.title} subtitle={s.subtitle} action={{ label: 'View all', href: '/products' }} />
          </Reveal>
          <ProductRail products={s.products} />
        </Container>
      ))}

      {promos.length === 0 && (
        <Container maxWidth="lg" sx={{ mt: { xs: 6, md: 10 } }}>
          <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' } }}>
            {[
              { title: 'New arrivals', text: 'See the latest ingredients added to the range.', cta: 'Browse latest', href: '/products?sort=newest', bg: `linear-gradient(135deg, ${brand.navy}, ${brand.navyDeep})` },
              { title: 'Need pricing or specifications?', text: 'Tell us what you need and we will send a quote.', cta: 'Request a quote', href: '/contact', bg: `linear-gradient(135deg, ${brand.greenDark}, #2F5A12)` },
            ].map((b, i) => (
              <Reveal key={b.title} delay={i * 0.1}>
                <Box component={Link} href={b.href} sx={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: { xs: 190, md: 240 }, borderRadius: 6, p: { xs: 2.5, md: 4 }, textDecoration: 'none', color: '#fff', background: b.bg }}>
                  <Box aria-hidden component="svg" viewBox="0 0 100 100" sx={{ position: 'absolute', right: -30, top: -30, width: 220, height: 220, opacity: 0.14 }}><polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" /><polygon points="50,24 74,38 74,66 50,80 26,66 26,38" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" /></Box>
                  <Typography variant="h3" component="h3" sx={{ color: '#fff', position: 'relative' }}>{b.title}</Typography>
                  <Typography sx={{ mt: 0.5, opacity: 0.92, position: 'relative' }}>{b.text}</Typography>
                  <Typography sx={{ mt: 1.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.5, position: 'relative' }}>{b.cta} <ArrowForwardIcon fontSize="small" /></Typography>
                </Box>
              </Reveal>
            ))}
          </Box>
        </Container>
      )}

      {promos.length > 0 && (
        <Container maxWidth="lg" sx={{ mt: { xs: 6, md: 10 } }}>
          <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: promos.length > 1 ? '1fr 1fr' : '1fr' } }}>
            {promos.map((b, i) => (
              <Reveal key={b.id} delay={i * 0.1}>
                <Box component={b.ctaUrl ? Link : 'div'} {...(b.ctaUrl ? { href: b.ctaUrl } : {})} sx={{ position: 'relative', display: 'flex', alignItems: 'flex-end', minHeight: { xs: 200, md: 260 }, borderRadius: 6, overflow: 'hidden', textDecoration: 'none', color: '#fff', background: `linear-gradient(135deg, ${brand.navy}, ${brand.navyDeep})`, p: { xs: 2.5, md: 4 } }}>
                  {b.imageUrl && <Image src={optimizedImage(b.imageUrl, 1000) ?? b.imageUrl} alt="" fill sizes="(max-width:900px) 100vw, 600px" style={{ objectFit: 'cover' }} />}
                  {b.imageUrl && <Box aria-hidden sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(16,36,63,.9) 0%, rgba(16,36,63,.55) 60%, rgba(16,36,63,.25) 100%)' }} />}
                  <Box sx={{ position: 'relative' }}>
                    <Typography variant="h3" component="h3" sx={{ color: '#fff' }}>{b.title}</Typography>
                    {b.subtitle && <Typography sx={{ mt: 0.5, opacity: 0.9 }}>{b.subtitle}</Typography>}
                    {b.ctaLabel && <Typography sx={{ mt: 1.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{b.ctaLabel} <ArrowForwardIcon fontSize="small" /></Typography>}
                  </Box>
                </Box>
              </Reveal>
            ))}
          </Box>
        </Container>
      )}

      <HowItWorks />

      <Container maxWidth="lg" sx={{ mt: { xs: 6, md: 10 } }}>
        <Reveal>
          <Box sx={{ display: 'grid', gap: { xs: 3, md: 6 }, gridTemplateColumns: { xs: '1fr', md: '0.8fr 1.2fr' }, alignItems: 'center', bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 7, p: { xs: 3, md: 6 }, boxShadow: shadows.soft }}>
            <Box sx={{ display: 'grid', placeItems: 'center', bgcolor: brand.canvas, borderRadius: 5, py: 4 }}>
              <Image src="/images/logo-full.png" alt="Venira Chemtrade logo" width={200} height={258} sizes="200px" style={{ width: 170, height: 'auto' }} />
            </Box>
            <Box>
              <Typography variant="overline" color="info.main">Our story</Typography>
              <Typography variant="h2" component="h2" sx={{ mt: 0.5, fontSize: { xs: '1.7rem', md: '2.3rem' } }}>The power behind the beauty products</Typography>
              <Typography sx={{ mt: 2, color: 'text.secondary', whiteSpace: 'pre-line' }}>
                {settings.brandStory ?? 'Venira Chemtrade is a trusted chemical trading partner supplying cosmetic ingredients - from emulsifiers, actives and surfactants to silicones, UV filters, oils, butters and extracts.'}
              </Typography>
              <Box sx={{ mt: 3, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button component={Link} href="/about" variant="contained">About us</Button>
                <Button component={Link} href="/contact" variant="outlined">Talk to our team</Button>
              </Box>
            </Box>
          </Box>
        </Reveal>
      </Container>

      {home.reviews.length > 0 && (
        <Container maxWidth="lg" sx={{ mt: { xs: 6, md: 10 } }}>
          <Reveal><SectionHeader eyebrow="Reviews" title="What customers say" /></Reveal>
          <Stagger>
            <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
              {home.reviews.slice(0, 3).map((r) => (
                <StaggerItem key={r.id}>
                  <Box sx={{ bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 5, p: 3, height: '100%', boxShadow: shadows.soft }}>
                    <Rating value={r.rating} readOnly size="small" />
                    {r.title && <Typography sx={{ fontWeight: 700, mt: 1 }}>{r.title}</Typography>}
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>{r.body}</Typography>
                    <Typography variant="caption" sx={{ mt: 2, display: 'block', fontWeight: 600 }}>{r.userName}{r.verifiedPurchase ? ' · Verified purchase' : ''}</Typography>
                  </Box>
                </StaggerItem>
              ))}
            </Box>
          </Stagger>
        </Container>
      )}

      <QuoteCta />

      {settings.featureFlags.newsletter !== false && (
        <Container maxWidth="md" sx={{ mt: { xs: 6, md: 10 } }}>
          <Reveal>
            <Box sx={{ textAlign: 'center', p: { xs: 3, md: 6 }, borderRadius: 7, background: `linear-gradient(135deg, ${brand.skyLight}, #fff 50%, ${brand.greenLight})`, border: `1px solid ${brand.line}` }}>
              <Typography variant="h3" component="h2">Get updates from Venira Chemtrade</Typography>
              <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>New ingredients, offers and announcements.</Typography>
              <Box sx={{ maxWidth: 480, mx: 'auto' }}><NewsletterForm /></Box>
            </Box>
          </Reveal>
        </Container>
      )}
    </>
  );
}
