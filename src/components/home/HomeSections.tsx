import Link from 'next/link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Reveal, Stagger, StaggerItem } from '@/components/animations/Reveal';
import { brand, shadows } from '@/theme/tokens';

const trust = [
  { icon: <VerifiedOutlinedIcon />, title: 'Quality assured', text: 'Consistent, tested batches' },
  { icon: <LocalShippingOutlinedIcon />, title: 'Reliable delivery', text: 'Dispatched across India' },
  { icon: <WorkspacePremiumOutlinedIcon />, title: 'Trusted range', text: 'Cosmetic-grade ingredients' },
  { icon: <SupportAgentOutlinedIcon />, title: 'Expert support', text: 'Specs and quotes on request' },
];

/** Floating trust bar that overlaps the bottom of the hero. */
/** lush: render as a normal block (mobile, below the product rail) instead of overlapping the hero's bottom edge. */
export function TrustStrip({ flush = false }: { flush?: boolean }) {
  return (
    <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, mt: flush ? 3 : { xs: -3, md: -5 } }}>
      <Reveal>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0,1fr))', md: 'repeat(4, minmax(0,1fr))' }, bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 5, boxShadow: shadows.lift, overflow: 'hidden' }}>
          {trust.map((t, i) => (
            <Box key={t.title} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: { xs: 1.75, md: 2.5 }, borderLeft: { md: i ? `1px solid ${brand.line}` : 'none' }, borderTop: { xs: i > 1 ? `1px solid ${brand.line}` : 'none', md: 'none' }, ...(i % 2 === 1 ? { borderLeft: { xs: `1px solid ${brand.line}`, md: `1px solid ${brand.line}` } } : {}) }}>
              <Box sx={{ flexShrink: 0, width: 44, height: 44, borderRadius: 3, display: 'grid', placeItems: 'center', color: '#fff', background: `linear-gradient(135deg, ${brand.navy}, ${brand.sky})` }}>{t.icon}</Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.88rem', md: '0.98rem' }, lineHeight: 1.25 }}>{t.title}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>{t.text}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Reveal>
    </Container>
  );
}

const steps = [
  { icon: <SearchOutlinedIcon />, title: 'Find your ingredient', text: 'Browse by category or search by name to shortlist what your formulation needs.' },
  { icon: <RequestQuoteOutlinedIcon />, title: 'Get a quote or order', text: 'Add items to your cart, or ask us for pricing and specifications.' },
  { icon: <Inventory2OutlinedIcon />, title: 'Receive at your door', text: 'We pack carefully and ship so your production never waits.' },
];

/** Three-step explainer on a soft tinted band. */
export function HowItWorks() {
  return (
    <Box component="section" sx={{ mt: { xs: 6, md: 10 }, py: { xs: 6, md: 9 }, background: `linear-gradient(180deg, ${brand.skyLight} 0%, #fff 100%)`, borderTop: `1px solid ${brand.line}`, borderBottom: `1px solid ${brand.line}` }}>
      <Container maxWidth="lg">
        <Reveal>
          <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
            <Typography variant="overline" sx={{ color: 'info.main' }}>Simple process</Typography>
            <Typography variant="h2" component="h2" sx={{ fontSize: { xs: '1.6rem', md: '2.3rem' }, mt: 0.5 }}>How it works</Typography>
          </Box>
        </Reveal>
        <Stagger>
          <Box sx={{ position: 'relative', display: 'grid', gap: { xs: 2.5, md: 4 }, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
            {steps.map((s, i) => (
              <StaggerItem key={s.title}>
                <Box sx={{ position: 'relative', height: '100%', bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 6, p: { xs: 3, md: 4 }, boxShadow: shadows.soft, transition: 'transform .25s, box-shadow .25s', '&:hover': { transform: 'translateY(-4px)', boxShadow: shadows.lift } }}>
                  <Typography aria-hidden sx={{ position: 'absolute', top: 10, right: 20, fontFamily: 'var(--font-display)', fontSize: '4rem', fontWeight: 700, lineHeight: 1, color: brand.skyLight }}>{i + 1}</Typography>
                  <Box sx={{ width: 56, height: 56, borderRadius: '50%', display: 'grid', placeItems: 'center', color: brand.greenDark, bgcolor: brand.greenLight, border: `1px solid ${brand.green}55`, mb: 2 }}>{s.icon}</Box>
                  <Typography variant="h5" component="h3" sx={{ position: 'relative' }}>{s.title}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 1, position: 'relative' }}>{s.text}</Typography>
                </Box>
              </StaggerItem>
            ))}
          </Box>
        </Stagger>
      </Container>
    </Box>
  );
}

/** Full-width closing call to action. */
export function QuoteCta() {
  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 6, md: 10 } }}>
      <Reveal>
        <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: 7, p: { xs: 3.5, md: 7 }, color: '#fff', background: `radial-gradient(600px 300px at 90% 0%, ${brand.sky}55, transparent 60%), linear-gradient(135deg, ${brand.navy}, ${brand.navyDeep})`, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 3 }}>
          <Box aria-hidden component="svg" viewBox="0 0 100 100" sx={{ position: 'absolute', right: -40, bottom: -60, width: 300, height: 300, opacity: 0.12 }}>
            <polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
            <polygon points="50,24 74,38 74,66 50,80 26,66 26,38" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
          </Box>
          <Box sx={{ position: 'relative', maxWidth: 620 }}>
            <Typography variant="h2" component="h2" sx={{ color: '#fff', fontSize: { xs: '1.7rem', md: '2.4rem' } }}>Can&apos;t find the ingredient you need?</Typography>
            <Typography sx={{ mt: 1.5, opacity: 0.88 }}>Tell us what you are formulating. We will source it, share specifications and send you a quote.</Typography>
          </Box>
          <Box sx={{ position: 'relative', display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button component={Link} href="/contact" variant="contained" size="large" endIcon={<ArrowForwardIcon />} sx={{ background: '#fff', color: brand.navy, boxShadow: 'none', '&:hover': { background: brand.skyLight, boxShadow: 'none' } }}>Request a quote</Button>
            <Button component={Link} href="/products" variant="outlined" size="large" sx={{ color: '#fff', borderColor: 'rgba(255,255,255,.55)', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,.1)' } }}>Browse range</Button>
          </Box>
        </Box>
      </Reveal>
    </Container>
  );
}
