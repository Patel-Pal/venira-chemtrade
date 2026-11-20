'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Rating from '@mui/material/Rating';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Skeleton from '@mui/material/Skeleton';
import LinearProgress from '@mui/material/LinearProgress';
import { useAdminList, useAdminMutation } from '@/hooks/useAdmin';
import { get, patch, post, put, del } from '@/lib/api-client';
import { useCan } from '@/hooks/useCan';
import { useUiStore } from '@/stores/ui.store';
import { ConfirmDialog, DataTable, PageHeader, Panel, dateTime, money, type Column } from './ui';
import { ErrorNote, StatusChip } from '@/components/common/ui';
import { brand } from '@/theme/tokens';
import DashboardView from './DashboardView';
import { ShippingAdmin, TaxAdmin } from './ResourceAdmins';

/* ----------------------------- Customers ----------------------------- */
export function CustomersAdmin() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState('');
  const { data, isLoading } = useAdminList<any>('customers', { page, limit: 20, search: term || undefined, status: status || undefined });
  const cols: Column<any>[] = [
    { key: 'name', label: 'Customer', primary: true, render: (c) => <Box><b>{c.name}</b><Typography variant="caption" color="text.secondary" display="block">{c.email}</Typography></Box> },
    { key: 'status', label: 'Status', render: (c) => <StatusChip status={c.status} /> },
    { key: 'orders', label: 'Orders', align: 'right', render: (c) => c.stats.orders },
    { key: 'spent', label: 'Total spent', align: 'right', render: (c) => money(c.stats.spentPaise) },
    { key: 'createdAt', label: 'Joined', hideOnMobile: true, render: (c) => dateTime(c.createdAt) },
  ];
  return (
    <Box>
      <PageHeader title="Customers" subtitle="Registered customers and their activity." />
      <Box component="form" onSubmit={(e) => { e.preventDefault(); setTerm(search); setPage(1); }} sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Search name, email, phone" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1, minWidth: 220 }} />
        <TextField select size="small" label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} sx={{ minWidth: 140 }}><MenuItem value="">All</MenuItem><MenuItem value="active">Active</MenuItem><MenuItem value="pending">Unverified</MenuItem><MenuItem value="blocked">Blocked</MenuItem></TextField>
        <Button type="submit" variant="outlined">Search</Button>
      </Box>
      <DataTable columns={cols} rows={data?.items ?? []} getId={(c) => c.id} loading={isLoading} onRowClick={(c) => router.push(`/admin/customers/${c.id}`)} page={page} limit={data?.limit ?? 20} total={data?.total} onPage={setPage} />
    </Box>
  );
}

export function CustomerDetail({ id }: { id: string }) {
  const qc = useQueryClient();
  const notify = useUiStore((s) => s.notify);
  const can = useCan();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin', 'customers', 'item', id], queryFn: () => get<any>(`/api/admin/customers/${id}`) });
  const [confirm, setConfirm] = useState(false);
  const block = useMutation({
    mutationFn: (blocked: boolean) => patch(`/api/admin/customers/${id}`, { blocked }),
    onSuccess: () => { notify('Customer updated'); setConfirm(false); qc.invalidateQueries({ queryKey: ['admin', 'customers'] }); refetch(); },
    onError: (e: Error) => notify(e.message, 'error'),
  });
  if (isLoading) return <Skeleton variant="rounded" height={300} />;
  if (error || !data) return <ErrorNote error={error ?? new Error('Not found')} />;
  const { user, addresses, orders, stats } = data;
  const blocked = user.status === 'blocked';
  return (
    <Box>
      <PageHeader title={user.name} subtitle={user.email} actions={<><Button component={Link} href="/admin/customers">Back</Button>{can('customers.update') && <Button color={blocked ? 'primary' : 'error'} variant="outlined" onClick={() => setConfirm(true)}>{blocked ? 'Unblock customer' : 'Block customer'}</Button>}</>} />
      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1fr 2fr' }, alignItems: 'start' }}>
        <Box sx={{ display: 'grid', gap: 2.5 }}>
          <Panel title="Profile">
            <Box sx={{ display: 'grid', gap: 0.75 }}>
              <Box sx={{ display: 'flex', gap: 1 }}><StatusChip status={user.status} />{user.emailVerified && <Chip size="small" label="Email verified" color="success" variant="outlined" />}</Box>
              <Typography variant="body2">Phone: {user.phone ?? '—'}</Typography>
              <Typography variant="body2">Joined: {dateTime(user.createdAt)}</Typography>
              <Typography variant="body2">Last login: {dateTime(user.lastLoginAt)}</Typography>
              <Typography variant="body2"><b>{stats.orders}</b> paid orders · <b>{money(stats.spentPaise)}</b> lifetime spend</Typography>
            </Box>
          </Panel>
          <Panel title="Addresses">{addresses.length === 0 ? <Typography color="text.secondary">None saved.</Typography> : addresses.map((a: any) => <Typography key={a.id} variant="body2" sx={{ mb: 1.5 }}><b>{a.fullName}</b><br />{a.line1}, {a.city}, {a.state} {a.postalCode}<br />{a.phone}</Typography>)}</Panel>
        </Box>
        <Panel title="Order history">
          <DataTable columns={[
            { key: 'orderNumber', label: 'Order', primary: true, render: (o: any) => <Link href={`/admin/orders/${o.id}`}><b>{o.orderNumber}</b></Link> },
            { key: 'totalPaise', label: 'Total', align: 'right', render: (o: any) => money(o.totalPaise) },
            { key: 'status', label: 'Status', render: (o: any) => <StatusChip status={o.status} /> },
            { key: 'createdAt', label: 'Date', hideOnMobile: true, render: (o: any) => dateTime(o.createdAt) },
          ]} rows={orders} getId={(o: any) => o.id} empty="No orders yet." />
        </Panel>
      </Box>
      <ConfirmDialog open={confirm} danger={!blocked} title={blocked ? 'Unblock customer?' : 'Block customer?'} body={blocked ? 'They will be able to sign in and order again.' : 'They will be signed out immediately and unable to sign in or order.'} confirmLabel={blocked ? 'Unblock' : 'Block'} busy={block.isPending} onClose={() => setConfirm(false)} onConfirm={() => block.mutate(!blocked)} />
    </Box>
  );
}

/* ------------------------------ Inventory ------------------------------ */
export function InventoryAdmin() {
  const can = useCan();
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(1);
  const [txPage, setTxPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [adj, setAdj] = useState<any | null>(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const { data, isLoading } = useAdminList<any>('inventory', { page, limit: 20, search: term || undefined, filter: filter || undefined });
  const tx = useAdminList<any>('inventory-tx', { page: txPage, limit: 25 }, '/api/admin/inventory/transactions');
  const adjust = useAdminMutation('inventory', (b: { variantId: string; delta: number; reason: string }) => post('/api/admin/inventory', b), 'Stock adjusted');
  const counts = (data as any)?.counts ?? { lowStock: 0, outOfStock: 0 };

  const cols: Column<any>[] = [
    { key: 'productName', label: 'Product', primary: true, render: (r) => <Box><b>{r.productName ?? '—'}</b><Typography variant="caption" color="text.secondary" display="block">{r.variantLabel} · {r.sku}</Typography></Box> },
    { key: 'quantityOnHand', label: 'On hand', align: 'right' },
    { key: 'quantityReserved', label: 'Reserved', align: 'right' },
    { key: 'available', label: 'Available', align: 'right', render: (r) => <b>{r.available}</b> },
    { key: 'status', label: 'Level', render: (r) => <StatusChip status={r.status} /> },
    ...(can('inventory.adjust') ? [{ key: '_a', label: '', align: 'right' as const, render: (r: any) => <Button size="small" onClick={(e) => { e.stopPropagation(); setAdj(r); setDelta(''); setReason(''); }}>Adjust</Button> }] : []),
  ];
  const txCols: Column<any>[] = [
    { key: 'createdAt', label: 'When', primary: true, render: (t) => dateTime(t.createdAt) },
    { key: 'sku', label: 'SKU' },
    { key: 'type', label: 'Type', render: (t) => <Chip size="small" label={t.type} /> },
    { key: 'quantityDelta', label: 'Change', align: 'right', render: (t) => <b style={{ color: t.quantityDelta < 0 ? '#9B1C1C' : '#1E6B35' }}>{t.quantityDelta > 0 ? `+${t.quantityDelta}` : t.quantityDelta}</b> },
    { key: 'reason', label: 'Reason / ref', hideOnMobile: true, render: (t) => t.reason ?? t.reference ?? '—' },
  ];

  return (
    <Box>
      <PageHeader title="Inventory" subtitle="Variant-level stock, reservations and history." />
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Chip label={`Low stock: ${counts.lowStock}`} color={counts.lowStock ? 'warning' : 'default'} onClick={() => { setFilter('low'); setTab(0); }} />
        <Chip label={`Out of stock: ${counts.outOfStock}`} color={counts.outOfStock ? 'error' : 'default'} onClick={() => { setFilter('out'); setTab(0); }} />
        {filter && <Chip label="Clear filter" variant="outlined" onClick={() => setFilter('')} />}
      </Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}><Tab label="Stock levels" /><Tab label="Transaction history" /></Tabs>
      {tab === 0 ? (
        <>
          <Box component="form" onSubmit={(e) => { e.preventDefault(); setTerm(search); setPage(1); }} sx={{ display: 'flex', gap: 1.5, mb: 2 }}><TextField size="small" placeholder="Search SKU or variant" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1, maxWidth: 360 }} /><Button type="submit" variant="outlined">Search</Button></Box>
          <DataTable columns={cols} rows={data?.items ?? []} getId={(r) => r.id} loading={isLoading} page={page} limit={data?.limit ?? 20} total={data?.total} onPage={setPage} empty="No stock records. Only variants with stock tracking appear here." />
        </>
      ) : <DataTable columns={txCols} rows={tx.data?.items ?? []} getId={(r) => r.id} loading={tx.isLoading} page={txPage} limit={tx.data?.limit ?? 25} total={tx.data?.total} onPage={setTxPage} />}

      <Dialog open={Boolean(adj)} onClose={() => setAdj(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Adjust stock</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          <Typography variant="body2" color="text.secondary">{adj?.productName} · {adj?.sku} · on hand {adj?.quantityOnHand}, reserved {adj?.quantityReserved}</Typography>
          <TextField label="Change (+ to add, − to remove)" type="number" value={delta} onChange={(e) => setDelta(e.target.value)} />
          <TextField label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} helperText="Required – recorded in the audit trail" />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={() => setAdj(null)}>Cancel</Button><Button variant="contained" disabled={!Number(delta) || reason.trim().length < 3 || adjust.isPending} onClick={async () => { try { await adjust.mutateAsync({ variantId: adj.variantId, delta: Math.trunc(Number(delta)), reason }); setAdj(null); } catch { /* toast */ } }}>Apply</Button></DialogActions>
      </Dialog>
    </Box>
  );
}

/* ------------------------------- Reviews ------------------------------- */
export function ReviewsAdmin() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('pending');
  const [target, setTarget] = useState<any | null>(null);
  const { data, isLoading } = useAdminList<any>('reviews', { page, limit: 20, status: status || undefined });
  const moderate = useAdminMutation('reviews', ({ id, s }: { id: string; s: string }) => patch(`/api/admin/reviews/${id}`, { status: s }), 'Review updated');
  const remove = useAdminMutation('reviews', (id: string) => del(`/api/admin/reviews/${id}`), 'Review deleted');
  const dist: { rating: number; count: number }[] = (data as any)?.distribution ?? [];
  const overall = (data as any)?.overall ?? { average: 0, count: 0 };
  const total = dist.reduce((a, b) => a + b.count, 0) || 1;
  const cols: Column<any>[] = [
    { key: 'productName', label: 'Product', primary: true, render: (r) => <b>{r.productName ?? '—'}</b> },
    { key: 'rating', label: 'Rating', render: (r) => <Rating value={r.rating} readOnly size="small" /> },
    { key: 'body', label: 'Review', render: (r) => <Box sx={{ maxWidth: 380 }}>{r.title && <b>{r.title}. </b>}{r.body}<Typography variant="caption" display="block" color="text.secondary">{r.userName} · {dateTime(r.createdAt)}</Typography></Box> },
    { key: 'verifiedPurchase', label: 'Verified', hideOnMobile: true, render: (r) => (r.verifiedPurchase ? <Chip size="small" color="success" label="Verified purchase" variant="outlined" /> : '—') },
    { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
    { key: '_a', label: '', align: 'right', render: (r) => <Box sx={{ whiteSpace: 'nowrap' }}>{r.status !== 'approved' && <Button size="small" onClick={() => moderate.mutate({ id: r.id, s: 'approved' })}>Approve</Button>}{r.status !== 'rejected' && <Button size="small" color="warning" onClick={() => moderate.mutate({ id: r.id, s: 'rejected' })}>Reject</Button>}<Button size="small" color="error" onClick={() => setTarget(r)}>Delete</Button></Box> },
  ];
  return (
    <Box>
      <PageHeader title="Reviews" subtitle="Moderate customer reviews before they appear in the store." />
      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '280px 1fr' }, mb: 2.5 }}>
        <Panel title="Rating statistics">
          <Typography sx={{ fontSize: '2rem', fontWeight: 800 }}>{overall.average.toFixed(1)} <Typography component="span" color="text.secondary" variant="body2">from {overall.count} approved</Typography></Typography>
          {dist.map((d) => <Box key={d.rating} sx={{ display: 'grid', gridTemplateColumns: '28px 1fr 28px', gap: 1, alignItems: 'center' }}><Typography variant="caption">{d.rating}★</Typography><LinearProgress variant="determinate" value={(d.count / total) * 100} sx={{ height: 6, borderRadius: 3 }} /><Typography variant="caption">{d.count}</Typography></Box>)}
        </Panel>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
          <TextField select size="small" label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} sx={{ minWidth: 160 }}><MenuItem value="">All</MenuItem><MenuItem value="pending">Pending</MenuItem><MenuItem value="approved">Approved</MenuItem><MenuItem value="rejected">Rejected</MenuItem></TextField>
        </Box>
      </Box>
      <DataTable columns={cols} rows={data?.items ?? []} getId={(r) => r.id} loading={isLoading} page={page} limit={data?.limit ?? 20} total={data?.total} onPage={setPage} empty="No reviews in this view." />
      <ConfirmDialog open={Boolean(target)} danger title="Delete review?" body="This permanently removes the review." confirmLabel="Delete" busy={remove.isPending} onClose={() => setTarget(null)} onConfirm={async () => { try { await remove.mutateAsync(target.id); setTarget(null); } catch { /* toast */ } }} />
    </Box>
  );
}

/* ------------------------------- Payments ------------------------------- */
export function PaymentsAdmin() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const { data, isLoading } = useAdminList<any>('payments', { page, limit: 20, status: status || undefined, search: term || undefined });
  const stats = (data as any)?.stats;
  const cols: Column<any>[] = [
    { key: 'orderNumber', label: 'Order', primary: true, render: (p) => <Link href={`/admin/orders/${p.orderId}`}><b>{p.orderNumber ?? p.orderId}</b></Link> },
    { key: 'providerPaymentId', label: 'Razorpay payment', render: (p) => <code>{p.providerPaymentId ?? '—'}</code>, hideOnMobile: true },
    { key: 'providerOrderId', label: 'Razorpay order', render: (p) => <code>{p.providerOrderId}</code>, hideOnMobile: true },
    { key: 'amountPaise', label: 'Amount', align: 'right', render: (p) => money(p.amountPaise) },
    { key: 'method', label: 'Method', render: (p) => p.method ?? '—' },
    { key: 'status', label: 'Status', render: (p) => <StatusChip status={p.status} /> },
    { key: 'refundedPaise', label: 'Refunded', align: 'right', render: (p) => (p.refundedPaise ? money(p.refundedPaise) : '—') },
    { key: 'signatureVerified', label: 'Verified', render: (p) => (p.signatureVerified ? <Chip size="small" color="success" label="Verified" variant="outlined" /> : <Chip size="small" label="No" />) },
    { key: 'createdAt', label: 'Date', hideOnMobile: true, render: (p) => dateTime(p.createdAt) },
  ];
  return (
    <Box>
      <PageHeader title="Payments" subtitle="Read-only ledger. Payments become 'captured' only through verified Razorpay callbacks/webhooks." />
      {stats && <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3,1fr)' }, mb: 2.5 }}>
        <Panel><Typography variant="caption" color="text.secondary">Successful</Typography><Typography variant="h5">{stats.successful}</Typography></Panel>
        <Panel><Typography variant="caption" color="text.secondary">Failed</Typography><Typography variant="h5">{stats.failed}</Typography></Panel>
        <Panel><Typography variant="caption" color="text.secondary">Captured amount</Typography><Typography variant="h5">{money(stats.capturedPaise)}</Typography></Panel>
      </Box>}
      <Box component="form" onSubmit={(e) => { e.preventDefault(); setTerm(search); setPage(1); }} sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Razorpay order / payment id" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1, minWidth: 220 }} />
        <TextField select size="small" label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} sx={{ minWidth: 160 }}><MenuItem value="">All</MenuItem>{['created', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'].map((s) => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s.replace(/_/g, ' ')}</MenuItem>)}</TextField>
        <Button type="submit" variant="outlined">Search</Button>
      </Box>
      <DataTable columns={cols} rows={data?.items ?? []} getId={(p) => p.id} loading={isLoading} page={page} limit={data?.limit ?? 20} total={data?.total} onPage={setPage} />
    </Box>
  );
}

/* ------------------------------- Reports ------------------------------- */
export function ReportsAdmin() {
  return <DashboardView title="Reports" />;
}

/* ------------------------------- Settings ------------------------------- */
export function SettingsAdmin({ canShipping }: { canShipping: boolean }) {
  const notify = useUiStore((s) => s.notify);
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const { data, isLoading, error } = useQuery({ queryKey: ['admin', 'settings'], queryFn: () => get<{ settings: any; integrations: { razorpay: boolean; cloudinary: boolean } }>('/api/admin/settings') });
  const s = data?.settings;
  const { control, register, handleSubmit } = useForm<any>({
    values: s ? { storeName: s.storeName ?? '', tagline: s.tagline ?? '', contactEmail: s.contactEmail ?? '', contactPhone: s.contactPhone ?? '', whatsapp: s.whatsapp ?? '', address: s.address ?? '', announcement: s.announcement ?? '', instagram: s.social?.instagram ?? '', facebook: s.social?.facebook ?? '', linkedin: s.social?.linkedin ?? '', youtube: s.social?.youtube ?? '', seoTitle: s.seo?.title ?? '', seoDescription: s.seo?.description ?? '', brandStory: s.brandStory ?? '', heroEyebrow: s.hero?.eyebrow ?? '', heroHeading: s.hero?.heading ?? '', heroSub: s.hero?.subheading ?? '', heroCta: s.hero?.ctaLabel ?? '', heroUrl: s.hero?.ctaUrl ?? '', orderEmails: s.notifications?.orderEmails ?? true, lowStockAlerts: s.notifications?.lowStockAlerts ?? true } : undefined,
  });
  const save = useMutation({
    mutationFn: (v: any) => put('/api/admin/settings', {
      storeName: v.storeName, tagline: v.tagline || undefined, contactEmail: v.contactEmail || undefined, contactPhone: v.contactPhone || undefined, whatsapp: v.whatsapp || undefined, address: v.address || undefined, announcement: v.announcement || undefined, brandStory: v.brandStory || undefined,
      social: { instagram: v.instagram || undefined, facebook: v.facebook || undefined, linkedin: v.linkedin || undefined, youtube: v.youtube || undefined },
      seo: { title: v.seoTitle || undefined, description: v.seoDescription || undefined },
      hero: { eyebrow: v.heroEyebrow || undefined, heading: v.heroHeading || undefined, subheading: v.heroSub || undefined, ctaLabel: v.heroCta || undefined, ctaUrl: v.heroUrl || undefined },
      notifications: { orderEmails: v.orderEmails, lowStockAlerts: v.lowStockAlerts },
    }),
    onSuccess: () => { notify('Settings saved'); qc.invalidateQueries({ queryKey: ['admin', 'settings'] }); },
    onError: (e: Error) => notify(e.message, 'error'),
  });
  if (isLoading) return <Skeleton variant="rounded" height={400} />;
  if (error || !data) return <ErrorNote error={error ?? new Error('Failed')} />;
  return (
    <Box>
      <PageHeader title="Settings" subtitle="Store information, contact details, SEO, shipping and tax." />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}><Tab label="Store" /><Tab label="Shipping" /><Tab label="Tax" /><Tab label="Integrations" /></Tabs>
      {tab === 0 && (
        <Box component="form" onSubmit={handleSubmit((v) => save.mutate(v))} sx={{ display: 'grid', gap: 2.5 }}>
          <Panel title="Store information"><Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <TextField label="Store name" {...register('storeName')} /><TextField label="Tagline" {...register('tagline')} />
            <TextField label="Contact email" type="email" {...register('contactEmail')} /><TextField label="Contact phone" {...register('contactPhone')} />
            <TextField label="WhatsApp" {...register('whatsapp')} /><TextField label="Announcement bar text" {...register('announcement')} helperText="Shown at the top of every page. Leave empty to hide." />
            <TextField label="Address" multiline minRows={2} {...register('address')} sx={{ gridColumn: { md: '1 / -1' } }} />
          </Box><Alert severity="info" sx={{ mt: 2 }}>The company logo is a fixed brand asset and is not editable here.</Alert></Panel>
          <Panel title="Homepage hero & brand story"><Box sx={{ display: 'grid', gap: 2 }}>
            <TextField label="Eyebrow" {...register('heroEyebrow')} /><TextField label="Heading" {...register('heroHeading')} /><TextField label="Sub-heading" multiline minRows={2} {...register('heroSub')} />
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}><TextField label="Button label" {...register('heroCta')} /><TextField label="Button link" {...register('heroUrl')} /></Box>
            <TextField label="Brand story" multiline minRows={4} {...register('brandStory')} />
          </Box></Panel>
          <Panel title="Social links"><Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>{['instagram', 'facebook', 'linkedin', 'youtube'].map((k) => <TextField key={k} label={k[0].toUpperCase() + k.slice(1) + ' URL'} {...register(k)} />)}</Box></Panel>
          <Panel title="SEO"><Box sx={{ display: 'grid', gap: 2 }}><TextField label="Default title" {...register('seoTitle')} /><TextField label="Default description" multiline minRows={2} {...register('seoDescription')} /></Box></Panel>
          <Panel title="Notifications"><Controller name="orderEmails" control={control} render={({ field }) => <FormControlLabel control={<Switch checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} />} label="Send order confirmation emails" />} /><Controller name="lowStockAlerts" control={control} render={({ field }) => <FormControlLabel control={<Switch checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} />} label="Low-stock alerts" />} /></Panel>
          <Box><Button type="submit" variant="contained" size="large" disabled={save.isPending}>Save settings</Button></Box>
        </Box>
      )}
      {tab === 1 && <ShippingAdmin canWrite={canShipping} />}
      {tab === 2 && <TaxAdmin canWrite={canShipping} />}
      {tab === 3 && (
        <Panel title="Integration status">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Secrets are managed through server environment variables and are never shown in the browser.</Typography>
          {[['Razorpay payments', data.integrations.razorpay], ['Cloudinary media', data.integrations.cloudinary]].map(([l, ok]) => <Box key={String(l)} sx={{ display: 'flex', justifyContent: 'space-between', py: 1.25, borderTop: `1px solid ${brand.line}` }}><Typography>{l}</Typography><Chip size="small" label={ok ? 'Configured' : 'Not configured'} color={ok ? 'success' : 'warning'} /></Box>)}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>Currency: INR (₹) · Webhook endpoint: /api/webhooks/razorpay</Typography>
        </Panel>
      )}
    </Box>
  );
}
