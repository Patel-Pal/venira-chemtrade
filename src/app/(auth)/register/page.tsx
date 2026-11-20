import { Suspense } from 'react';
import type { Metadata } from 'next';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { RegisterForm } from '@/components/forms/AuthForms';

export const metadata: Metadata = { title: 'Create account', robots: { index: false } };

export default function RegisterPage() {
  return (
    <Box>
      <Typography variant="h3" component="h1" sx={{ mb: 0.5 }}>Create your account</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>Track orders, save addresses and check out faster.</Typography>
      <Suspense><RegisterForm /></Suspense>
    </Box>
  );
}
