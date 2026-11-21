'use client';
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useAdminList } from '@/hooks/useAdmin';
import { useCategories } from '@/hooks/useCatalog';
import { useCan } from '@/hooks/useCan';
import { patch } from '@/lib/api-client';
import { useUiStore } from '@/stores/ui.store';
import { PageHeader } from './ui';
import { StatusChip } from '@/components/common/ui';
import { brand, shadows } from '@/theme/tokens';

interface Row { variantId: string; productId: string; productName: string; category: string; status: string; label: string; sku: string; pricePaise: number | null; compareAtPricePaise: number | null }
interface Draft { price: string; mrp: string }

const PAGE_SIZE = 50;
const toRupees = (p: number | null) => (p === null || p === undefined ? '' : String(p / 100));
const toPaise = (s: string) => (s.trim() === '' ? null : Math.round(Number(s) * 100));
const valid = (s: string) => s.trim() === '' || (Number.isFinite(Number(s)) && Number(s) >= 0 && Number(s) <= 1_000_000);

export default function PricingAdmin() {
  const qc = useQueryClient();
  const notify = useUiStore((s) => s.notify);
  const can = useCan();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const { data: cats = [] } = useCategories();
  const { data, isLoading } = useAdminList<Row>('pricing', { page, limit: PAGE_SIZE, search: term || undefined, categoryId: categoryId || undefined });

  const rows = useMemo(() => (data?.items ?? []).filter((r) => !onlyMissing || (drafts[r.variantId] ? drafts[r.variantId].price.trim() === '' : r.pricePaise === null)), [data, onlyMissing, drafts]);
  const current = (r: Row): Draft => drafts[r.variantId] ?? { price: toRupees(r.pricePaise), mrp: toRupees(r.compareAtPricePaise) };
  const setField = (r: Row, f: keyof Draft, v: string) => setDrafts((d) => ({ ...d, [r.variantId]: { ...current(r), [f]: v } }));

  const errorFor = (d: Draft) => {
    if (!valid(d.price) || !valid(d.mrp)) return 'Enter a valid amount';
    if (d.mrp.trim() !== '' && d.price.trim() === '') return 'Add a price first';
    if (d.mrp.trim() !== '' && Number(d.mrp) < Number(d.price)) return 'MRP is below price';
    return '';
  };
  const dirty = Object.entries(drafts).filter(([id, d]) => {
    const r = data?.items.find((x) => x.variantId === id);
    return r && (toPaise(d.price) !== r.pricePaise || toPaise(d.mrp) !== r.compareAtPricePaise);
  });
  const hasErrors = dirty.some(([, d]) => errorFor(d));

  const save = useMutation({
    mutationFn: () => patch<{ updated: number }>('/api/admin/pricing', { updates: dirty.map(([variantId, d]) => ({ variantId, pricePaise: toPaise(d.price), compareAtPricePaise: toPaise(d.mrp) })) }),
    onSuccess: (r) => { notify(`${r.updated} price${r.updated === 1 ? '' : 's'} saved`); setDrafts({}); qc.invalidateQueries({ queryKey: ['admin'] }); },
    onError: (e: Error) => notify(e.message, 'error'),
  });

  const canEdit = can('products.update');

  return (
    <Box>
      <PageHeader title="Pricing" subtitle="Set the selling price and MRP for every product in one place." actions={canEdit ? <Button variant="contained" startIcon={<SaveOutlinedIcon />} disabled={dirty.length === 0 || hasErrors || save.isPending} onClick={() => save.mutate()}>{dirty.length ? `Save ${dirty.length} change${dirty.length === 1 ? '' : 's'}` : 'Save changes'}</Button> : undefined} />
      <Alert severity="info" sx={{ mb: 2, borderRadius: 3 }}>
        Enter the <b>Price</b> customers pay and, optionally, the <b>MRP</b> (the higher, struck-through price). The storefront then shows the discount like &quot;₹450 <s>₹600</s> 25% off&quot;. Leave the price empty to keep the item as &quot;Request a quote&quot;. Amounts are in rupees.
      </Alert>

      <Box component="form" onSubmit={(e) => { e.preventDefault(); setTerm(search); setPage(1); }} sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1, minWidth: 220 }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
        <TextField select size="small" label="Category" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} sx={{ minWidth: 200 }}>
          <MenuItem value="">All categories</MenuItem>
          {cats.filter((c) => !c.parentId).map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>
        <FormControlLabel control={<Switch checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />} label="Only without price" />
        <Button type="submit" variant="outlined">Search</Button>
      </Box>

      <Box sx={{ bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 4, overflow: 'hidden', boxShadow: shadows.soft }}>
        <TableContainer sx={{ maxHeight: '68vh' }}>
          <Table size="small" stickyHeader aria-label="Pricing table">
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Pack</TableCell>
                <TableCell sx={{ width: 150 }}>Price (₹)</TableCell>
                <TableCell sx={{ width: 150 }}>MRP (₹)</TableCell>
                <TableCell sx={{ width: 110 }}>Discount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? Array.from({ length: 8 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>{onlyMissing ? 'Every product on this page has a price.' : 'No products found.'}</TableCell></TableRow>
              ) : rows.map((r) => {
                const d = current(r);
                const err = errorFor(d);
                const changed = toPaise(d.price) !== r.pricePaise || toPaise(d.mrp) !== r.compareAtPricePaise;
                const pct = !err && d.price && d.mrp && Number(d.mrp) > Number(d.price) ? Math.round((1 - Number(d.price) / Number(d.mrp)) * 100) : 0;
                return (
                  <TableRow key={r.variantId} hover sx={{ bgcolor: changed ? `${brand.skyLight}88` : undefined }}>
                    <TableCell sx={{ fontWeight: 600 }}>{r.productName} {r.status !== 'published' && <StatusChip status={r.status} />}</TableCell>
                    <TableCell>{r.category}</TableCell>
                    <TableCell><Chip size="small" label={r.label} /></TableCell>
                    <TableCell>
                      <TextField size="small" type="number" value={d.price} disabled={!canEdit} error={!valid(d.price)} onChange={(e) => setField(r, 'price', e.target.value)} placeholder="Quote" slotProps={{ htmlInput: { min: 0, step: '0.01', 'aria-label': `Price for ${r.productName}` } }} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" type="number" value={d.mrp} disabled={!canEdit} error={Boolean(err) && valid(d.price)} helperText={err && valid(d.price) ? err : undefined} onChange={(e) => setField(r, 'mrp', e.target.value)} placeholder="Optional" slotProps={{ htmlInput: { min: 0, step: '0.01', 'aria-label': `MRP for ${r.productName}` } }} />
                    </TableCell>
                    <TableCell>{pct > 0 ? <Chip size="small" label={`${pct}% off`} sx={{ bgcolor: brand.greenLight, color: brand.greenDark, fontWeight: 700 }} /> : d.price === '' ? <Chip size="small" label="Quote" /> : '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={data?.total ?? 0} page={page - 1} rowsPerPage={PAGE_SIZE} rowsPerPageOptions={[PAGE_SIZE]} onPageChange={(_, p) => setPage(p + 1)} />
      </Box>
      {dirty.length > 0 && <Alert severity="warning" sx={{ mt: 2, borderRadius: 3 }}>You have {dirty.length} unsaved change{dirty.length === 1 ? '' : 's'}. Save before changing page or filters, or the edits on other pages stay pending until you save.</Alert>}
    </Box>
  );
}
