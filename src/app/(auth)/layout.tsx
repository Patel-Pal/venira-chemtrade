import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import { LogoFull } from '@/components/common/Logo';
import { brand, shadows } from '@/theme/tokens';

const perks = [
  { icon: <VerifiedOutlinedIcon />, text: 'Cosmetic-grade ingredients you can trust' },
  { icon: <LocalShippingOutlinedIcon />, text: 'Track every order from dispatch to delivery' },
  { icon: <SupportAgentOutlinedIcon />, text: 'Quotes and specifications on request' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, background: `radial-gradient(900px 400px at 90% -10%, ${brand.skyLight}, transparent 60%), radial-gradient(700px 400px at -10% 110%, ${brand.greenLight}, transparent 55%), ${brand.canvas}` }}>
      {/* Brand panel (desktop only) */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, position: 'relative', overflow: 'hidden', flexDirection: 'column', justifyContent: 'center', p: 8, color: '#fff', background: `radial-gradient(600px 400px at 100% 0%, ${brand.sky}55, transparent 60%), linear-gradient(145deg, ${brand.navy}, ${brand.navyDeep})` }}>
        <Box aria-hidden component="svg" viewBox="0 0 100 100" sx={{ position: 'absolute', right: -80, bottom: -90, width: 460, height: 460, opacity: 0.1 }}>
          <polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
          <polygon points="50,24 74,38 74,66 50,80 26,66 26,38" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
        </Box>
        <Box aria-hidden component="svg" viewBox="0 0 100 100" sx={{ position: 'absolute', left: -50, top: -50, width: 240, height: 240, opacity: 0.08 }}>
          <polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
        </Box>
        <Box sx={{ position: 'relative', maxWidth: 440 }}>
          <Box sx={{ bgcolor: '#fff', borderRadius: 4, p: 1.5, display: 'inline-block', boxShadow: '0 12px 40px rgba(0,0,0,.25)' }}>
            <Link href="/" aria-label="Venira Chemtrade home"><LogoFull height={110} priority /></Link>
          </Box>
          <Typography variant="h2" component="p" sx={{ color: '#fff', mt: 4, fontSize: '2.3rem' }}>The power behind the beauty products</Typography>
          <Box sx={{ mt: 4, display: 'grid', gap: 2 }}>
            {perks.map((p) => (
              <Box key={p.text} sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
                <Box sx={{ flexShrink: 0, width: 42, height: 42, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.2)' }}>{p.icon}</Box>
                <Typography sx={{ opacity: 0.92 }}>{p.text}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Form panel */}
      <Box sx={{ display: 'grid', placeItems: 'center', p: 2 }}>
        <Box sx={{ width: '100%', maxWidth: 440, py: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 3, display: { md: 'none' } }}>
            <Link href="/" aria-label="Venira Chemtrade home"><LogoFull height={110} priority /></Link>
          </Box>
          <Box sx={{ position: 'relative', overflow: 'hidden', bgcolor: '#fff', borderRadius: 6, border: `1px solid ${brand.line}`, boxShadow: shadows.lift, p: { xs: 3, sm: 4 }, '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${brand.sky}, ${brand.green})` } }}>{children}</Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
            <Link href="/">← Back to store</Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
