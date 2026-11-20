'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { forgotSchema, loginSchema, registerSchema, resetSchema } from '@/schemas';
import { post, fieldErrors } from '@/lib/api-client';
import { qk } from '@/lib/query-keys';
import { safeNext } from '@/utils/url';

function PasswordField({ label = 'Password', error, helper, autoComplete, reg }: { label?: string; error?: boolean; helper?: string; autoComplete: string; reg: object }) {
  const [show, setShow] = useState(false);
  return (
    <TextField
      label={label} type={show ? 'text' : 'password'} autoComplete={autoComplete} error={error} helperText={helper} {...reg}
      slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconButton aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((s) => !s)} edge="end">{show ? <VisibilityOffIcon /> : <VisibilityIcon />}</IconButton></InputAdornment> } }}
    />
  );
}

function useSubmit(setError: (k: never, v: { message: string }) => void) {
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setFormError('');
    try {
      await fn();
    } catch (e) {
      const fe = fieldErrors(e);
      Object.entries(fe).forEach(([k, m]) => setError(k as never, { message: m }));
      setFormError(Object.keys(fe).length ? '' : e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };
  return { formError, busy, run };
}

export function LoginForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const next = safeNext(useSearchParams().get('next'), '/account');
  const { register, handleSubmit, setError, formState: { errors } } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });
  const { formError, busy, run } = useSubmit(setError as never);
  return (
    <Box component="form" noValidate onSubmit={handleSubmit((v) => run(async () => {
      await post('/api/auth/login', v);
      await qc.invalidateQueries({ queryKey: qk.me });
      router.replace(next);
      router.refresh();
    }))} sx={{ display: 'grid', gap: 2 }}>
      {formError && <Alert severity="error">{formError}</Alert>}
      <TextField label="Email" type="email" autoComplete="email" error={Boolean(errors.email)} helperText={errors.email?.message} {...register('email')} />
      <PasswordField autoComplete="current-password" error={Boolean(errors.password)} helper={errors.password?.message} reg={register('password')} />
      <Box sx={{ textAlign: 'right', mt: -1 }}><Typography component={Link} href="/forgot-password" variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>Forgot password?</Typography></Box>
      <Button type="submit" variant="contained" size="large" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
      <Typography variant="body2" textAlign="center">New here? <Link href={`/register?next=${encodeURIComponent(next)}`} style={{ fontWeight: 700 }}>Create an account</Link></Typography>
    </Box>
  );
}

export function RegisterForm() {
  const next = safeNext(useSearchParams().get('next'), '/account');
  const [done, setDone] = useState<{ message: string; autoVerified: boolean } | null>(null);
  const { register, handleSubmit, setError, formState: { errors } } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) });
  const { formError, busy, run } = useSubmit(setError as never);
  if (done) {
    return (
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Alert severity="success">{done.message}</Alert>
        <Button variant="contained" size="large" component={Link} href={`/login?next=${encodeURIComponent(next)}`}>Go to sign in</Button>
        {!done.autoVerified && <Typography variant="body2" color="text.secondary">Check your inbox (and spam folder) for the verification link.</Typography>}
      </Box>
    );
  }
  return (
    <Box component="form" noValidate onSubmit={handleSubmit((v) => run(async () => {
      const r = await post<{ message: string; autoVerified: boolean }>('/api/auth/register', v);
      setDone(r);
    }))} sx={{ display: 'grid', gap: 2 }}>
      {formError && <Alert severity="error">{formError}</Alert>}
      <TextField label="Full name" autoComplete="name" error={Boolean(errors.name)} helperText={errors.name?.message} {...register('name')} />
      <TextField label="Email" type="email" autoComplete="email" error={Boolean(errors.email)} helperText={errors.email?.message} {...register('email')} />
      <TextField label="Mobile number (optional)" type="tel" autoComplete="tel" error={Boolean(errors.phone)} helperText={errors.phone?.message} {...register('phone', { setValueAs: (v) => (v ? v : undefined) })} />
      <PasswordField autoComplete="new-password" error={Boolean(errors.password)} helper={errors.password?.message ?? 'At least 8 characters with a letter and a number'} reg={register('password')} />
      <Button type="submit" variant="contained" size="large" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</Button>
      <Typography variant="body2" textAlign="center">Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} style={{ fontWeight: 700 }}>Sign in</Link></Typography>
    </Box>
  );
}

export function ForgotForm() {
  const [msg, setMsg] = useState('');
  const { register, handleSubmit, setError, formState: { errors } } = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema) });
  const { formError, busy, run } = useSubmit(setError as never);
  return (
    <Box component="form" noValidate onSubmit={handleSubmit((v) => run(async () => { setMsg((await post<{ message: string }>('/api/auth/forgot-password', v)).message); }))} sx={{ display: 'grid', gap: 2 }}>
      {formError && <Alert severity="error">{formError}</Alert>}
      {msg && <Alert severity="success">{msg}</Alert>}
      <TextField label="Email" type="email" autoComplete="email" error={Boolean(errors.email)} helperText={errors.email?.message} {...register('email')} />
      <Button type="submit" variant="contained" size="large" disabled={busy}>Send reset link</Button>
      <Typography variant="body2" textAlign="center"><Link href="/login" style={{ fontWeight: 700 }}>Back to sign in</Link></Typography>
    </Box>
  );
}

export function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const { register, handleSubmit, setError, formState: { errors } } = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema), defaultValues: { token } });
  const { formError, busy, run } = useSubmit(setError as never);
  if (!token) return <Alert severity="error">This reset link is missing its token. Please request a new one.</Alert>;
  return (
    <Box component="form" noValidate onSubmit={handleSubmit((v) => run(async () => { await post('/api/auth/reset-password', v); router.replace('/login?reset=1'); }))} sx={{ display: 'grid', gap: 2 }}>
      {formError && <Alert severity="error">{formError}</Alert>}
      <input type="hidden" {...register('token')} />
      <PasswordField label="New password" autoComplete="new-password" error={Boolean(errors.password)} helper={errors.password?.message ?? 'At least 8 characters with a letter and a number'} reg={register('password')} />
      <Button type="submit" variant="contained" size="large" disabled={busy}>Update password</Button>
    </Box>
  );
}
