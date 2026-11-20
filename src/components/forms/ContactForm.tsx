'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { enquirySchema } from '@/schemas';
import { fieldErrors, post } from '@/lib/api-client';

export default function ContactForm() {
  const product = useSearchParams().get('product') ?? '';
  const [done, setDone] = useState('');
  const [err, setErr] = useState('');
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<z.infer<typeof enquirySchema>>({
    resolver: zodResolver(enquirySchema),
    defaultValues: { productName: product || undefined, message: product ? `Hello, please share pricing, available pack sizes and specifications for ${product}.` : '' },
  });
  return (
    <Box component="form" noValidate onSubmit={handleSubmit(async (v) => {
      setErr('');
      try { const r = await post<{ message: string }>('/api/enquiries', v); setDone(r.message); reset(); }
      catch (e) { Object.entries(fieldErrors(e)).forEach(([k, m]) => setError(k as never, { message: m })); setErr(e instanceof Error ? e.message : 'Could not send'); }
    })} sx={{ display: 'grid', gap: 2 }}>
      {done && <Alert severity="success">{done}</Alert>}
      {err && <Alert severity="error">{err}</Alert>}
      {product && <TextField label="Regarding" value={product} slotProps={{ input: { readOnly: true } }} {...register('productName')} />}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <TextField label="Your name" autoComplete="name" error={Boolean(errors.name)} helperText={errors.name?.message} {...register('name')} />
        <TextField label="Email" type="email" autoComplete="email" error={Boolean(errors.email)} helperText={errors.email?.message} {...register('email')} />
      </Box>
      <TextField label="Mobile (optional)" type="tel" error={Boolean(errors.phone)} helperText={errors.phone?.message} {...register('phone', { setValueAs: (v) => (v ? v : undefined) })} />
      <TextField label="Message" multiline minRows={4} error={Boolean(errors.message)} helperText={errors.message?.message} {...register('message')} />
      <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>Send message</Button>
    </Box>
  );
}
