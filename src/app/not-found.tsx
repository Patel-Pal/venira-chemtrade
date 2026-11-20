import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { LogoFull } from '@/components/common/Logo';

export default function NotFound() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', p: 3 }}>
      <Box sx={{ maxWidth: 460 }}>
        <LogoFull height={150} />
        <Typography sx={{ fontFamily: 'var(--font-display)', fontSize: '5rem', fontWeight: 600, color: 'primary.main', lineHeight: 1, mt: 2 }}>404</Typography>
        <Typography variant="h3" component="h1" sx={{ mt: 1 }}>We can&apos;t find that page</Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5 }}>The link may be broken or the page may have moved.</Typography>
        <Box sx={{ mt: 3, display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button component={Link} href="/" variant="contained" size="large">Back to home</Button>
          <Button component={Link} href="/products" variant="outlined" size="large">Browse ingredients</Button>
        </Box>
      </Box>
    </Box>
  );
}
