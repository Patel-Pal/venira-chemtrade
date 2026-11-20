import { Suspense } from 'react';
import type { Metadata } from 'next';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { LoginForm } from '@/components/forms/AuthForms';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const sp = await searchParams;
  return (
    <Box>
      <Typography variant="h3" component="h1" sx={{ mb: 0.5 }}>Welcome back</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>{sp.reset ? 'Password updated – please sign in.' : 'Sign in to your account.'}</Typography>
      <Suspense><LoginForm /></Suspense>
    </Box>
  );
}
