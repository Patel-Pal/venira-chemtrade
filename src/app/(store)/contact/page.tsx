import { Suspense } from 'react';
import type { Metadata } from 'next';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import ContactForm from '@/components/forms/ContactForm';
import { getPublicSettings } from '@/modules/settings/public-settings';
import { brand, shadows } from '@/theme/tokens';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Contact us', description: 'Get in touch for pricing, specifications and quotes.', alternates: { canonical: '/contact' } };

export default async function ContactPage() {
  const s = await getPublicSettings();
  const rows = [
    s.address && { icon: <PlaceOutlinedIcon />, label: 'Address', value: s.address },
    s.contactPhone && { icon: <PhoneOutlinedIcon />, label: 'Phone', value: s.contactPhone, href: `tel:${s.contactPhone.replace(/\s/g, '')}` },
    s.contactEmail && { icon: <EmailOutlinedIcon />, label: 'Email', value: s.contactEmail, href: `mailto:${s.contactEmail}` },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string; href?: string }[];
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 7 } }}>
      <Typography variant="overline" color="info.main">Get in touch</Typography>
      <Typography variant="h1" component="h1" sx={{ fontSize: { xs: '2rem', md: '3rem' }, mb: 1 }}>Contact us</Typography>
      <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 560 }}>Tell us what you need and we&apos;ll respond with pricing, pack sizes and specifications.</Typography>
      <Box sx={{ display: 'grid', gap: { xs: 3, md: 5 }, gridTemplateColumns: { xs: '1fr', md: '1fr 1.2fr' }, alignItems: 'start' }}>
        <Box sx={{ display: 'grid', gap: 2 }}>
          {rows.map((r) => (
            <Box key={r.label} sx={{ display: 'flex', gap: 2, p: 2.5, bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 4, boxShadow: shadows.soft }}>
              <Box sx={{ width: 44, height: 44, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: brand.skyLight, color: brand.navy, flexShrink: 0 }}>{r.icon}</Box>
              <Box><Typography variant="caption" color="text.secondary">{r.label}</Typography>{r.href ? <Typography component="a" href={r.href} sx={{ display: 'block', fontWeight: 700, textDecoration: 'none' }}>{r.value}</Typography> : <Typography sx={{ fontWeight: 700 }}>{r.value}</Typography>}</Box>
            </Box>
          ))}
        </Box>
        <Box sx={{ bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 5, p: { xs: 2.5, md: 4 }, boxShadow: shadows.soft }}>
          <Suspense><ContactForm /></Suspense>
        </Box>
      </Box>
    </Container>
  );
}
