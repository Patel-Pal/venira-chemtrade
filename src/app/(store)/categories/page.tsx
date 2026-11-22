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
        <Typography variant="overline" color="info.main">Browse</Typography>
        <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.8rem', md: '2.6rem' }, mb: 3 }}>Categories</Typography>
      </Reveal>
      {roots.length === 0 ? <EmptyState title="No categories yet" body="Categories will appear here once they are added." action={{ label: 'Back to home', href: '/' }} /> : (
        <Stagger>
          <Box sx={{ display: 'grid', gap: { xs: 1.5, md: 3 }, gridTemplateColumns: { xs: 'repeat(2, minmax(0,1fr))', md: 'repeat(3, minmax(0,1fr))' } }}>
            {roots.map((c) => (
              <StaggerItem key={c.id}>
                <Box component={Link} href={`/products?category=${c.slug}`} sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: { xs: 2, md: 3 }, minHeight: { xs: 130, md: 170 }, bgcolor: '#fff', borderRadius: 5, border: `1px solid ${brand.line}`, boxShadow: shadows.soft, textDecoration: 'none', transition: 'transform .25s, box-shadow .25s', '&:hover': { transform: 'translateY(-4px)', boxShadow: shadows.lift } }}>
                  {c.image?.url ? <Box sx={{ position: 'relative', height: { xs: 80, md: 110 }, mx: { xs: -2, md: -3 }, mt: { xs: -2, md: -3 }, mb: 0.5, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}><Image src={optimizedImage(c.image.url, 600) ?? c.image.url} alt="" fill sizes="(max-width:600px) 50vw, 360px" style={{ objectFit: 'cover' }} /></Box> : <Box sx={{ width: 44, height: 44, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: brand.skyLight, color: brand.navy }}><ScienceOutlinedIcon /></Box>}
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
