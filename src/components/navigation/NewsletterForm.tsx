'use client';
import { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { post } from '@/lib/api-client';
import { useUiStore } from '@/stores/ui.store';

export default function NewsletterForm({ dark = false }: { dark?: boolean }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const notify = useUiStore((s) => s.notify);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await post<{ message: string }>('/api/newsletter', { email });
      notify(r.message);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not subscribe');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box component="form" onSubmit={submit} noValidate sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
      <TextField
        type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" required error={Boolean(error)} helperText={error || undefined}
        slotProps={{ htmlInput: { 'aria-label': 'Email address', autoComplete: 'email' } }}
        sx={dark ? { '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,.08)', color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,.25)' } }, '& .MuiFormHelperText-root': { color: '#ffb4b4' } } : undefined}
      />
      <Button type="submit" variant="contained" color={dark ? 'info' : 'primary'} disabled={busy} sx={{ flexShrink: 0, height: 52 }}>Subscribe</Button>
    </Box>
  );
}
