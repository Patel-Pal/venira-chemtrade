import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { LogoFull } from '@/components/common/Logo';
import { brand, shadows } from '@/theme/tokens';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2, background: `radial-gradient(900px 400px at 90% -10%, ${brand.skyLight}, transparent 60%), radial-gradient(700px 400px at -10% 110%, ${brand.greenLight}, transparent 55%), ${brand.canvas}` }}>
      <Box sx={{ width: '100%', maxWidth: 440, py: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Link href="/" aria-label="Venira Chemtrade home"><LogoFull height={120} priority /></Link>
        </Box>
        <Box sx={{ bgcolor: '#fff', borderRadius: 6, border: `1px solid ${brand.line}`, boxShadow: shadows.lift, p: { xs: 3, sm: 4 } }}>{children}</Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
          <Link href="/">← Back to store</Link>
        </Typography>
      </Box>
    </Box>
  );
}
