import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { LogoFull } from '@/components/common/Logo';
import { brand, shadows } from '@/theme/tokens';

export default function NotFound() {
  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', p: 3, background: `radial-gradient(900px 400px at 90% -10%, ${brand.skyLight}, transparent 60%), radial-gradient(700px 400px at -10% 110%, ${brand.greenLight}, transparent 55%), ${brand.canvas}` }}>
      <Box aria-hidden component="svg" viewBox="0 0 100 100" sx={{ position: 'absolute', right: '-5%', top: '8%', width: 360, height: 360, opacity: 0.08, color: brand.navy }}>
        <polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <polygon points="50,24 74,38 74,66 50,80 26,66 26,38" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </Box>
      <Box aria-hidden component="svg" viewBox="0 0 100 100" sx={{ position: 'absolute', left: '-4%', bottom: '6%', width: 280, height: 280, opacity: 0.08, color: brand.greenDark }}>
        <polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      </Box>
      <Box sx={{ position: 'relative', maxWidth: 480, bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 7, boxShadow: shadows.lift, p: { xs: 3, md: 5 } }}>
        <LogoFull height={130} />
        <Typography sx={{ fontFamily: 'var(--font-display)', fontSize: '5.5rem', fontWeight: 600, lineHeight: 1, mt: 2, background: `linear-gradient(135deg, ${brand.navy}, ${brand.sky} 60%, ${brand.green})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>404</Typography>
        <Typography variant="h3" component="h1" sx={{ mt: 1, color: 'primary.dark' }}>We can&apos;t find that page</Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5 }}>The link may be broken or the page may have moved.</Typography>
        <Box sx={{ mt: 3, display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button component={Link} href="/" variant="contained" size="large">Back to home</Button>
          <Button component={Link} href="/products" variant="outlined" size="large">Browse ingredients</Button>
        </Box>
      </Box>
    </Box>
  );
}
