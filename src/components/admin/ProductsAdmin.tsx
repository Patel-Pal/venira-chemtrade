'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import { useAdminList } from '@/hooks/useAdmin';
import { del } from '@/lib/api-client';
import { useCan } from '@/hooks/useCan';
import { useUiStore } from '@/stores/ui.store';
import { ConfirmDialog, DataTable, PageHeader, money, type Column } from './ui';
import { StatusChip } from '@/components/common/ui';
import { optimizedImage } from '@/utils/image';

interface Row { id: string; name: string; slug: string; status: string; category: string; isFeatured: boolean; isBestSeller: boolean; dataStatus: string; variants: number; minPricePaise: number | null; image: string | null }

export default function ProductsAdmin() {
  const router = useRouter();
  const qc = useQueryClient();
  const notify = useUiStore((s) => s.notify);
  const can = useCan();
  const sp = useSearchParams();
  const [search, setSearch] = useState(sp.get('search') ?? '');
  const [term, setTerm] = useState(sp.get('search') ?? '');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [archiving, setArchiving] = useState<Row | null>(null);
  const { data, isLoading } = useAdminList<Row>('products', { page, limit: 20, search: term || undefined, status: status || undefined });
  const archive = useMutation({
    mutationFn: (id: string) => del(`/api/admin/products/${id}`),
    onSuccess: () => { notify('Product archived', 'info'); qc.invalidateQueries({ queryKey: ['admin', 'products'] }); setArchiving(null); },
    onError: (e: Error) => notify(e.message, 'error'),
  });

  const cols: Column<Row>[] = [
    { key: 'name', label: 'Product', primary: true, render: (r) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar variant="rounded" src={optimizedImage(r.image ?? undefined, 80)} sx={{ width: 40, height: 40, bgcolor: '#E3F2F8', color: '#2B5290', fontSize: '0.8rem' }}>{r.name[0]}</Avatar>
        <Box sx={{ minWidth: 0 }}><b>{r.name}</b>{r.dataStatus === 'pending_admin_input' && <Chip size="small" label="Info pending" sx={{ ml: 1, height: 20, bgcolor: '#FFF4DB', color: '#8A5A00' }} />}</Box>
      </Box>
    ) },
    { key: 'category', label: 'Category' },
    { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
    { key: 'variants', label: 'Variants', align: 'right', hideOnMobile: true },
    { key: 'minPricePaise', label: 'From price', align: 'right', render: (r) => (r.minPricePaise === null ? <Chip size="small" label="On request" /> : money(r.minPricePaise)) },
    { key: 'flags', label: 'Flags', hideOnMobile: true, render: (r) => <>{r.isFeatured && <Chip size="small" label="Featured" sx={{ mr: 0.5 }} />}{r.isBestSeller && <Chip size="small" label="Best seller" />}</> },
    ...(can('products.delete') ? [{ key: '_a', label: '', align: 'right' as const, render: (r: Row) => r.status !== 'archived' ? <IconButton aria-label={`Archive ${r.name}`} onClick={(e) => { e.stopPropagation(); setArchiving(r); }}><ArchiveOutlinedIcon /></IconButton> : null }] : []),
  ];

  return (
    <Box>
      <PageHeader title="Products" subtitle="Manage the catalogue, variants, pricing and images." actions={can('products.create') ? <Button component={Link} href="/admin/products/new" variant="contained" startIcon={<AddIcon />}>Add product</Button> : undefined} />
      <Box component="form" onSubmit={(e) => { e.preventDefault(); setTerm(search); setPage(1); }} sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Search name, SKU, description…" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1, minWidth: 220 }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
        <TextField select size="small" label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} sx={{ minWidth: 150 }}>
          <MenuItem value="">All</MenuItem><MenuItem value="published">Published</MenuItem><MenuItem value="draft">Draft</MenuItem><MenuItem value="archived">Archived</MenuItem>
        </TextField>
        <Button type="submit" variant="outlined">Search</Button>
      </Box>
      <DataTable columns={cols} rows={data?.items ?? []} getId={(r) => r.id} loading={isLoading} onRowClick={(r) => router.push(`/admin/products/${r.id}`)} page={page} limit={data?.limit ?? 20} total={data?.total} onPage={setPage} empty="No products found." />
      <ConfirmDialog open={Boolean(archiving)} danger title="Archive product?" body={`"${archiving?.name}" will be hidden from the store. Order history is preserved and you can restore it by editing the status.`} confirmLabel="Archive" busy={archive.isPending} onClose={() => setArchiving(null)} onConfirm={() => archiving && archive.mutate(archiving.id)} />
    </Box>
  );
}
