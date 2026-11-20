'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Rating from '@mui/material/Rating';
import Skeleton from '@mui/material/Skeleton';
import Pagination from '@mui/material/Pagination';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import HistoryIcon from '@mui/icons-material/History';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { changePasswordSchema, profileSchema } from '@/schemas';
import { del, get, patch, post, fieldErrors } from '@/lib/api-client';
import { qk } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { useAddresses, useOrders } from '@/hooks/useAccount';
import { useProductsByIds } from '@/hooks/useCatalog';
import { useRecentlyViewedStore } from '@/stores/recently-viewed.store';
import AddressForm from '@/components/forms/AddressForm';
import { EmptyState, ErrorNote, StatusChip } from '@/components/common/ui';
import { ProductGrid } from '@/components/products/ProductCard';
import { formatPaise } from '@/utils/money';
import { brand } from '@/theme/tokens';
import type { Address } from '@/types/domain';

export function ProfilePanel() {
  const user = useAuthStore((s) => s.user);
  const notify = useUiStore((s) => s.notify);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<z.infer<typeof profileSchema>>({ resolver: zodResolver(profileSchema), values: { name: user?.name ?? '', phone: user?.phone ?? '' } });
  return (
    <Box component="form" noValidate onSubmit={handleSubmit(async (v) => {
      try {
        const u = await patch<{ name: string; phone?: string }>('/api/users/me', v);
        useAuthStore.setState((s) => ({ user: s.user ? { ...s.user, name: u.name, phone: u.phone } : s.user }));
        notify('Profile updated');
      } catch (e) {
        Object.entries(fieldErrors(e)).forEach(([k, m]) => setError(k as never, { message: m }));
        notify(e instanceof Error ? e.message : 'Update failed', 'error');
      }
    })} sx={{ bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 5, p: { xs: 2, md: 3 }, display: 'grid', gap: 2, maxWidth: 560 }}>
      {user && !user.emailVerified && <Alert severity="warning">Your email is not verified yet. Check your inbox for the verification link.</Alert>}
      <TextField label="Full name" error={Boolean(errors.name)} helperText={errors.name?.message} {...register('name')} />
      <TextField label="Email" value={user?.email ?? ''} disabled helperText="Contact support to change your email" />
      <TextField label="Mobile number" type="tel" error={Boolean(errors.phone)} helperText={errors.phone?.message} {...register('phone')} />
      <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ justifySelf: 'start' }}>Save changes</Button>
    </Box>
  );
}

export function PasswordPanel() {
  const notify = useUiStore((s) => s.notify);
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<z.infer<typeof changePasswordSchema>>({ resolver: zodResolver(changePasswordSchema) });
  return (
    <Box component="form" noValidate onSubmit={handleSubmit(async (v) => {
      try { const r = await post<{ message: string }>('/api/auth/change-password', v); notify(r.message); reset(); }
      catch (e) { Object.entries(fieldErrors(e)).forEach(([k, m]) => setError(k as never, { message: m })); notify(e instanceof Error ? e.message : 'Failed', 'error'); }
    })} sx={{ bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 5, p: { xs: 2, md: 3 }, display: 'grid', gap: 2, maxWidth: 560 }}>
      <TextField label="Current password" type="password" autoComplete="current-password" error={Boolean(errors.currentPassword)} helperText={errors.currentPassword?.message} {...register('currentPassword')} />
      <TextField label="New password" type="password" autoComplete="new-password" error={Boolean(errors.newPassword)} helperText={errors.newPassword?.message ?? 'At least 8 characters with a letter and a number'} {...register('newPassword')} />
      <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ justifySelf: 'start' }}>Update password</Button>
    </Box>
  );
}

export function AddressesPanel() {
  const qc = useQueryClient();
  const notify = useUiStore((s) => s.notify);
  const { data = [], isLoading, error } = useAddresses();
  const [editing, setEditing] = useState<Address | 'new' | null>(null);
  const remove = useMutation({ mutationFn: (id: string) => del(`/api/users/addresses/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: qk.addresses }); notify('Address removed', 'info'); } });
  if (isLoading) return <Skeleton variant="rounded" height={160} sx={{ borderRadius: 5 }} />;
  if (error) return <ErrorNote error={error} />;
  if (editing) return (
    <Box sx={{ bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 5, p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" component="h2" sx={{ mb: 2 }}>{editing === 'new' ? 'Add address' : 'Edit address'}</Typography>
      <AddressForm address={editing === 'new' ? undefined : editing} onCancel={() => setEditing(null)} onSaved={() => { qc.invalidateQueries({ queryKey: qk.addresses }); setEditing(null); notify('Address saved'); }} />
    </Box>
  );
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Button variant="contained" onClick={() => setEditing('new')} sx={{ justifySelf: 'start' }}>+ Add address</Button>
      {data.length === 0 ? <EmptyState icon={<PlaceOutlinedIcon fontSize="large" />} title="No saved addresses" body="Add a delivery address to check out faster." /> : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          {data.map((a) => (
            <Box key={a.id} sx={{ bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 4, p: 2.5 }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                {a.label && <Chip size="small" label={a.label} />}
                {a.isDefaultShipping && <Chip size="small" color="primary" label="Default shipping" />}
                {a.isDefaultBilling && <Chip size="small" color="secondary" label="Default billing" />}
              </Box>
              <Typography sx={{ fontWeight: 700 }}>{a.fullName}</Typography>
              <Typography variant="body2" color="text.secondary">{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.state} {a.postalCode}<br />{a.phone}{a.gstin ? <><br />GSTIN: {a.gstin}</> : null}</Typography>
              <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
                <Button size="small" onClick={() => setEditing(a)}>Edit</Button>
                <Button size="small" color="error" onClick={() => remove.mutate(a.id)} disabled={remove.isPending}>Delete</Button>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

export function OrdersPanel() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useOrders(page);
  if (isLoading) return <Box sx={{ display: 'grid', gap: 1.5 }}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={86} sx={{ borderRadius: 4 }} />)}</Box>;
  if (error) return <ErrorNote error={error} onRetry={() => refetch()} />;
  if (!data || data.items.length === 0) return <EmptyState icon={<ReceiptLongOutlinedIcon fontSize="large" />} title="No orders yet" body="When you place an order it will appear here." action={{ label: 'Start shopping', href: '/products' }} />;
  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      {data.items.map((o) => (
        <Box key={o.id} component={Link} href={`/orders/${o.id}`} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 4, p: 2.5, textDecoration: 'none', transition: 'box-shadow .2s', '&:hover': { boxShadow: '0 8px 24px rgba(16,36,63,.1)' } }}>
          <Box>
            <Typography sx={{ fontWeight: 800 }}>{o.orderNumber}</Typography>
            <Typography variant="caption" color="text.secondary">{new Date(o.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontWeight: 800 }}>{formatPaise(o.totalPaise)}</Typography>
            <StatusChip status={o.status} />
          </Box>
        </Box>
      ))}
      {data.total > data.limit && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}><Pagination count={Math.ceil(data.total / data.limit)} page={page} onChange={(_, p) => setPage(p)} color="primary" /></Box>}
    </Box>
  );
}

export function RecentlyViewedPanel() {
  const ids = useRecentlyViewedStore((s) => s.productIds);
  const clear = useRecentlyViewedStore((s) => s.clear);
  const { data, isLoading } = useProductsByIds(ids);
  if (!ids.length) return <EmptyState icon={<HistoryIcon fontSize="large" />} title="Nothing here yet" body="Items you view will show up here." action={{ label: 'Browse ingredients', href: '/products' }} />;
  if (isLoading) return <Skeleton variant="rounded" height={260} sx={{ borderRadius: 5 }} />;
  return <Box><Button onClick={clear} size="small" sx={{ mb: 2 }}>Clear history</Button>{data && <ProductGrid products={data} />}</Box>;
}

export function MyReviewsPanel() {
  const { data, isLoading, error } = useQuery({ queryKey: ['users', 'reviews'], queryFn: () => get<{ items: { id: string; rating: number; title?: string; body: string; status: string; createdAt: string; product: { name: string; slug: string } | null }[] }>('/api/users/reviews') });
  if (isLoading) return <Skeleton variant="rounded" height={120} sx={{ borderRadius: 5 }} />;
  if (error) return <ErrorNote error={error} />;
  if (!data?.items.length) return <EmptyState icon={<StarBorderIcon fontSize="large" />} title="No reviews yet" body="Share your experience on a product page." action={{ label: 'Browse ingredients', href: '/products' }} />;
  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      {data.items.map((r) => (
        <Box key={r.id} sx={{ bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 4, p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            {r.product ? <Typography component={Link} href={`/products/${r.product.slug}`} sx={{ fontWeight: 700 }}>{r.product.name}</Typography> : <span />}
            <StatusChip status={r.status} />
          </Box>
          <Rating value={r.rating} readOnly size="small" sx={{ mt: 0.5 }} />
          {r.title && <Typography sx={{ fontWeight: 600 }}>{r.title}</Typography>}
          <Typography color="text.secondary" variant="body2">{r.body}</Typography>
        </Box>
      ))}
    </Box>
  );
}
