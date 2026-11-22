import Link from 'next/link';
import Image from 'next/image';
import { optimizedImage } from '@/utils/image';
import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import { cached } from '@/lib/cache';
import { listPublicCategories } from '@/modules/products/catalog.service';
import { Reveal, Stagger, StaggerItem } from '@/components/animations/Reveal';
import { EmptyState } from '@/components/common/ui';
import { brand, shadows } from '@/theme/tokens';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Categories', description: 'Browse all ingredient categories.', alternates: { canonical: '/categories' } };

const load = cached(async () => {
  try {
    return await listPublicCategories();
  } catch {
    return [];
  }
}, ['categories-page'], 60);

export default async function CategoriesPage() {
  const cats = await load();
  const roots = cats.filter((c) => !c.parentId);
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}>
      <Reveal>
        <Box sx={{ position: 'relative', overflow: 'hidden', mb: { xs: 3, md: 5 }, p: { xs: 3, md: 5 }, borderRadius: 6, border: `1px solid ${brand.line}`, background: `radial-gradient(600px 260px at 100% 0%, ${brand.skyLight}, transparent 70%), radial-gradient(500px 260px at 0% 100%, ${brand.greenLight}, transparent 70%), #fff`, boxShadow: shadows.soft }}>
          <Box aria-hidden component="svg" viewBox="0 0 100 100" sx={{ position: 'absolute', right: -20, top: -30, width: 220, height: 220, opacity: 0.12, color: brand.navy }}>
            <polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
            <polygon points="50,24 74,38 74,66 50,80 26,66 26,38" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
          </Box>
          <Typography variant="overline" color="info.main">Browse</Typography>
          <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.8rem', md: '2.6rem' }, color: 'primary.dark', position: 'relative' }}>Categories</Typography>
          <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 520, position: 'relative' }}>Find the right ingredient family for your formulation.</Typography>
        </Box>
      </Reveal>
      {roots.length === 0 ? <EmptyState title="No categories yet" body="Categories will appear here once they are added." action={{ label: 'Back to home', href: '/' }} /> : (
        <Stagger>
          <Box sx={{ display: 'grid', gap: { xs: 1.5, md: 3 }, gridTemplateColumns: { xs: 'repeat(2, minmax(0,1fr))', md: 'repeat(3, minmax(0,1fr))' } }}>
            {roots.map((c) => (
              <StaggerItem key={c.id}>
                <Box component={Link} href={`/products?category=${c.slug}`} sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: { xs: 2, md: 3 }, minHeight: { xs: 130, md: 170 }, bgcolor: '#fff', borderRadius: 5, border: `1px solid ${brand.line}`, boxShadow: shadows.soft, textDecoration: 'none', transition: 'transform .25s, box-shadow .25s, border-color .25s', '& .ico': { transition: 'all .25s' }, '&:hover': { transform: 'translateY(-5px)', boxShadow: shadows.lift, borderColor: `${brand.sky}99`, '& .ico': { color: '#fff', background: `linear-gradient(135deg, ${brand.navy}, ${brand.sky})` } } }}>
                  {c.image?.url ? <Box sx={{ position: 'relative', height: { xs: 80, md: 110 }, mx: { xs: -2, md: -3 }, mt: { xs: -2, md: -3 }, mb: 0.5, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}><Image src={optimizedImage(c.image.url, 600) ?? c.image.url} alt="" fill sizes="(max-width:600px) 50vw, 360px" style={{ objectFit: 'cover' }} /></Box> : <Box className="ico" sx={{ width: 48, height: 48, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: brand.skyLight, color: brand.navy }}><ScienceOutlinedIcon /></Box>}
                  <Typography sx={{ fontWeight: 700, fontSize: { xs: '1rem', md: '1.2rem' } }}>{c.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 'auto' }}>{c.productCount} items</Typography>
                </Box>
              </StaggerItem>
            ))}
          </Box>
        </Stagger>
      )}
    </Container>
  );
}
