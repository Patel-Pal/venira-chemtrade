import { Suspense } from 'react';
import type { Metadata } from 'next';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { ResetForm } from '@/components/forms/AuthForms';

export const metadata: Metadata = { title: 'Reset password', robots: { index: false } };

export default function ResetPage() {
  return (
    <Box>
      <Typography variant="h3" component="h1" sx={{ mb: 0.5 }}>Choose a new password</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>Your reset link is valid for one hour.</Typography>
      <Suspense><ResetForm /></Suspense>
    </Box>
  );
}
