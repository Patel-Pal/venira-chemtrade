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
      <Box sx={{ position: 'relative', overflow: 'hidden', mb: 4, p: { xs: 3, md: 5 }, borderRadius: 6, border: `1px solid ${brand.line}`, boxShadow: shadows.soft, background: `radial-gradient(600px 260px at 100% 0%, ${brand.skyLight}, transparent 70%), radial-gradient(500px 260px at 0% 100%, ${brand.greenLight}, transparent 70%), #fff` }}>
        <Box aria-hidden component="svg" viewBox="0 0 100 100" sx={{ position: 'absolute', right: -20, top: -30, width: 220, height: 220, opacity: 0.1, color: brand.navy }}>
          <polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="50,24 74,38 74,66 50,80 26,66 26,38" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
        </Box>
        <Typography variant="overline" color="info.main">Get in touch</Typography>
        <Typography variant="h1" component="h1" sx={{ fontSize: { xs: '2rem', md: '3rem' }, mb: 1, color: 'primary.dark', position: 'relative' }}>Contact us</Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 560, position: 'relative' }}>Tell us what you need and we&apos;ll respond with pricing, pack sizes and specifications.</Typography>
      </Box>
      <Box sx={{ display: 'grid', gap: { xs: 3, md: 5 }, gridTemplateColumns: { xs: '1fr', md: '1fr 1.2fr' }, alignItems: 'start' }}>
        <Box sx={{ display: 'grid', gap: 2 }}>
          {rows.map((r) => (
            <Box key={r.label} sx={{ display: 'flex', gap: 2, p: 2.5, bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 5, boxShadow: shadows.soft, transition: 'transform .25s, box-shadow .25s', '&:hover': { transform: 'translateY(-3px)', boxShadow: shadows.lift } }}>
              <Box sx={{ width: 48, height: 48, borderRadius: 3, display: 'grid', placeItems: 'center', color: '#fff', background: `linear-gradient(135deg, ${brand.navy}, ${brand.sky})`, flexShrink: 0 }}>{r.icon}</Box>
              <Box><Typography variant="caption" color="text.secondary">{r.label}</Typography>{r.href ? <Typography component="a" href={r.href} sx={{ display: 'block', fontWeight: 700, textDecoration: 'none' }}>{r.value}</Typography> : <Typography sx={{ fontWeight: 700 }}>{r.value}</Typography>}</Box>
            </Box>
          ))}
        </Box>
        <Box sx={{ bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 5, p: { xs: 2.5, md: 4 }, boxShadow: shadows.lift, borderTop: `4px solid ${brand.sky}` }}>
          <Suspense><ContactForm /></Suspense>
        </Box>
      </Box>
    </Container>
  );
}
