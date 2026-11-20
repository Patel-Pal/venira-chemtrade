import Image from 'next/image';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/** Official logo files are used unmodified (only whitespace-trimmed crops of the supplied JPEG). */
export function LogoFull({ height = 160, priority = false }: { height?: number; priority?: boolean }) {
  const width = Math.round(height * (440 / 568));
  return <Image src="/images/logo-full.png" alt="Venira Chemtrade - Trusted Chemical Trading Partner" width={width} height={height} priority={priority} style={{ height, width: 'auto' }} />;
}

/** Compact header lockup: official emblem + live-text brand name. */
export function LogoLink({ compact = false }: { compact?: boolean }) {
  return (
    <Box component={Link} href="/" aria-label="Venira Chemtrade home" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25, textDecoration: 'none', color: 'inherit', minHeight: 44 }}>
      <Image src="/images/logo-mark.png" alt="" width={44} height={40} priority style={{ height: 40, width: 'auto' }} />
      {!compact && (
        <Box sx={{ lineHeight: 1, display: { xs: 'none', sm: 'block' } }}>
          <Typography component="span" sx={{ display: 'block', fontWeight: 800, letterSpacing: '0.08em', fontSize: '1.05rem', color: 'primary.main' }}>
            VENIRA
          </Typography>
          <Typography component="span" sx={{ display: 'block', fontWeight: 500, letterSpacing: '0.24em', fontSize: '0.62rem', color: 'info.main', mt: 0.25 }}>
            CHEMTRADE
          </Typography>
        </Box>
      )}
    </Box>
  );
}
