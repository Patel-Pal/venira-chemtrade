import type { Metadata } from 'next';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { ForgotForm } from '@/components/forms/AuthForms';

export const metadata: Metadata = { title: 'Forgot password', robots: { index: false } };

export default function ForgotPage() {
  return (
    <Box>
      <Typography variant="h3" component="h1" sx={{ mb: 0.5 }}>Forgot your password?</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>Enter your email and we&apos;ll send you a reset link.</Typography>
      <ForgotForm />
    </Box>
  );
}
