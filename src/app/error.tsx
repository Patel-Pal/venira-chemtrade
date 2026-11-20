'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

/** Route-level error boundary. Never shows stack traces or internal messages. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Box role="alert" sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center', textAlign: 'center', p: 3 }}>
      <Box sx={{ maxWidth: 440 }}>
        <Typography variant="h3" component="h1">Something went wrong</Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5 }}>An unexpected error occurred. Please try again.{error.digest ? ` (ref: ${error.digest})` : ''}</Typography>
        <Box sx={{ mt: 3, display: 'flex', gap: 1.5, justifyContent: 'center' }}>
          <Button variant="contained" onClick={reset}>Try again</Button>
          <Button href="/" variant="outlined">Home</Button>
        </Box>
      </Box>
    </Box>
  );
}
