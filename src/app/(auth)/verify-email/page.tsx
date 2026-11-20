'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { post } from '@/lib/api-client';

function Verify() {
  const token = useSearchParams().get('token') ?? '';
  const [state, setState] = useState<'loading' | 'ok' | 'error'>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? '' : 'This verification link is missing its token.');
  const ran = useRef(false);
  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    post<{ message: string }>('/api/auth/verify-email', { token })
      .then((r) => { setState('ok'); setMessage(r.message); })
      .catch((e: Error) => { setState('error'); setMessage(e.message); });
  }, [token]);
  return (
    <Box sx={{ textAlign: 'center', display: 'grid', gap: 2 }}>
      <Typography variant="h3" component="h1">Email verification</Typography>
      {state === 'loading' ? <CircularProgress sx={{ mx: 'auto' }} aria-label="Verifying" /> : <Alert severity={state === 'ok' ? 'success' : 'error'}>{message}</Alert>}
      {state !== 'loading' && <Button component={Link} href="/login" variant="contained" size="large">Go to sign in</Button>}
    </Box>
  );
}
export default function VerifyEmailPage() {
  return <Suspense><Verify /></Suspense>;
}
