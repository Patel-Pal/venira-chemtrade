import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { LogoFull } from './Logo';

export default function MaintenanceView({ phone }: { phone?: string }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', p: 3, bgcolor: 'background.default' }}>
      <Box sx={{ maxWidth: 480 }}>
        <LogoFull height={180} priority />
        <Typography variant="h2" component="h1" sx={{ mt: 3, fontSize: '2rem' }}>We&apos;ll be right back</Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5 }}>
          The store is undergoing scheduled maintenance. Please check back shortly.
          {phone ? ` For urgent enquiries call ${phone}.` : ''}
        </Typography>
      </Box>
    </Box>
  );
}
