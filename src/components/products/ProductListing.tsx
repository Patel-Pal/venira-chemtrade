'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Pagination from '@mui/material/Pagination';
import Chip from '@mui/material/Chip';
import Badge from '@mui/material/Badge';
import Divider from '@mui/material/Divider';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Rating from '@mui/material/Rating';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import TuneIcon from '@mui/icons-material/Tune';
import CloseIcon from '@mui/icons-material/Close';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { useCategories, useProducts } from '@/hooks/useCatalog';
import { ProductGrid } from './ProductCard';
import { EmptyState, ErrorNote, ProductGridSkeleton } from '@/components/common/ui';
import { DEFAULT_FILTERS, useFilterStore, type SortKey } from '@/stores/filter.store';
import { useUiStore } from '@/stores/ui.store';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'popularity', label: 'Popularity' },
  { value: 'rating', label: 'Customer rating' },
];
const PAGE_SIZE = 12;

function FilterGroup({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <Accordion defaultExpanded={defaultOpen} disableGutters elevation={0} square sx={{ bgcolor: 'transparent', '&::before': { display: 'none' }, borderBottom: '1px solid', borderColor: 'divider' }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0, minHeight: 48 }}>
        <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 0, pt: 0, pb: 2 }}>{children}</AccordionDetails>
    </Accordion>
  );
}

function FilterPanel({ onApply }: { onApply?: () => void }) {
  const f = useFilterStore();
  const { data: cats = [] } = useCategories();
  const roots = cats.filter((c) => !c.parentId);
  const [min, setMin] = useState(f.minPrice);
  const [max, setMax] = useState(f.maxPrice);
  useEffect(() => { setMin(f.minPrice); setMax(f.maxPrice); }, [f.minPrice, f.maxPrice]);

  return (
    <Box component="section" aria-label="Filters">
      <FilterGroup title="Category">
        <List dense disablePadding>
          <ListItemButton selected={!f.category} onClick={() => { f.set({ category: '' }); onApply?.(); }} sx={{ borderRadius: 2, minHeight: 40 }}>
            <ListItemText primary="All categories" />
          </ListItemButton>
          {roots.map((c) => (
            <Box key={c.id}>
              <ListItemButton selected={f.category === c.slug} onClick={() => { f.set({ category: c.slug }); onApply?.(); }} sx={{ borderRadius: 2, minHeight: 40 }}>
                <ListItemText primary={c.name} secondary={`${c.productCount} items`} slotProps={{ secondary: { fontSize: '0.72rem' } }} />
              </ListItemButton>
              {cats.filter((s) => s.parentId === c.id).map((s) => (
                <ListItemButton key={s.id} selected={f.category === s.slug} onClick={() => { f.set({ category: s.slug }); onApply?.(); }} sx={{ borderRadius: 2, pl: 4, minHeight: 36 }}>
                  <ListItemText primary={s.name} />
                </ListItemButton>
              ))}
            </Box>
          ))}
        </List>
      </FilterGroup>
      <FilterGroup title="Price (₹)">
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField size="small" type="number" label="Min" value={min} onChange={(e) => setMin(e.target.value)} onBlur={() => f.set({ minPrice: min })} slotProps={{ htmlInput: { min: 0, inputMode: 'numeric' } }} />
          <Typography>–</Typography>
          <TextField size="small" type="number" label="Max" value={max} onChange={(e) => setMax(e.target.value)} onBlur={() => f.set({ maxPrice: max })} slotProps={{ htmlInput: { min: 0, inputMode: 'numeric' } }} />
        </Box>
      </FilterGroup>
      <FilterGroup title="Availability">
        <FormControlLabel control={<Switch checked={f.inStock} onChange={(e) => f.set({ inStock: e.target.checked })} />} label="In stock / available only" />
      </FilterGroup>
      <FilterGroup title="Minimum rating">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Rating value={f.minRating} onChange={(_, v) => f.set({ minRating: v ?? 0 })} />
          {f.minRating > 0 && <Button size="small" onClick={() => f.set({ minRating: 0 })}>Clear</Button>}
        </Box>
      </FilterGroup>
      <Button variant="outlined" fullWidth onClick={() => { f.reset(); onApply?.(); }} sx={{ mt: 2 }}>Reset filters</Button>
    </Box>
  );
}
export default function ProductListing({ title = 'All ingredients' }: { title?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const f = useFilterStore();
  const filterOpen = useUiStore((s) => s.filterOpen);
  const setFilterOpen = useUiStore((s) => s.setFilterOpen);
  const hydrated = useRef(false);
  const { data: cats = [] } = useCategories();

  // URL -> store (once), store -> URL (afterwards). URL stays shareable; store drives the UI.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    f.hydrate({
      q: sp.get('q') ?? '', category: sp.get('category') ?? '', minPrice: sp.get('minPrice') ?? '', maxPrice: sp.get('maxPrice') ?? '',
      inStock: sp.get('inStock') === 'true', minRating: Number(sp.get('minRating') ?? 0) || 0,
      sort: (SORTS.find((s) => s.value === sp.get('sort'))?.value ?? 'newest') as SortKey,
    });
    f.setPage(Math.max(1, Number(sp.get('page') ?? 1) || 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Navigating from the header search while already on this page changes the URL: follow it.
  const urlQ = sp.get('q') ?? '';
  const urlCat = sp.get('category') ?? '';
  useEffect(() => {
    if (!hydrated.current) return;
    const s = useFilterStore.getState();
    if (s.q !== urlQ || s.category !== urlCat) s.set({ q: urlQ, category: urlCat });
  }, [urlQ, urlCat]);

  const params = useMemo(
    () => ({
      page: f.page, limit: PAGE_SIZE, sort: f.sort, q: f.q || undefined, category: f.category || undefined,
      minPrice: f.minPrice || undefined, maxPrice: f.maxPrice || undefined, inStock: f.inStock || undefined, minRating: f.minRating || undefined,
    }),
    [f.page, f.sort, f.q, f.category, f.minPrice, f.maxPrice, f.inStock, f.minRating],
  );

  useEffect(() => {
    if (!hydrated.current) return;
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && !(k === 'limit') && !(k === 'page' && v === 1) && !(k === 'sort' && v === 'newest') && qs.set(k, String(v)));
    const next = qs.toString() ? `${pathname}?${qs}` : pathname;
    router.replace(next, { scroll: false });
  }, [params, pathname, router]);

  const { data, isLoading, isFetching, error, refetch } = useProducts(params, hydrated.current || true);
  const activeCategory = cats.find((c) => c.slug === f.category);
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const activeCount = [f.category, f.minPrice, f.maxPrice, f.inStock || '', f.minRating || ''].filter(Boolean).length;

  const chips: { label: string; clear: () => void }[] = [];
  if (f.q) chips.push({ label: `"${f.q}"`, clear: () => f.set({ q: '' }) });
  if (activeCategory) chips.push({ label: activeCategory.name, clear: () => f.set({ category: '' }) });
  if (f.minPrice) chips.push({ label: `Min ₹${f.minPrice}`, clear: () => f.set({ minPrice: '' }) });
  if (f.maxPrice) chips.push({ label: `Max ₹${f.maxPrice}`, clear: () => f.set({ maxPrice: '' }) });
  if (f.inStock) chips.push({ label: 'In stock', clear: () => f.set({ inStock: false }) });
  if (f.minRating) chips.push({ label: `${f.minRating}★ & up`, clear: () => f.set({ minRating: 0 }) });

  return (
    <Box sx={{ display: 'grid', gap: { md: 4 }, gridTemplateColumns: { xs: '1fr', md: '260px 1fr' }, alignItems: 'start' }}>
      <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'sticky', top: 100, bgcolor: '#fff', border: '1px solid', borderColor: 'divider', borderRadius: 5, p: 2.5 }}>
        <FilterPanel />
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2.2rem' } }}>{activeCategory?.name ?? (f.q ? `Results for "${f.q}"` : title)}</Typography>
            <Typography variant="body2" color="text.secondary" aria-live="polite">{data ? `${data.total} ${data.total === 1 ? 'item' : 'items'}` : 'Loading…'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Badge badgeContent={activeCount} color="primary">
              <Button variant="outlined" startIcon={<TuneIcon />} onClick={() => setFilterOpen(true)} sx={{ display: { md: 'none' } }}>Filters</Button>
            </Badge>
            <TextField select size="small" label="Sort by" value={f.sort} onChange={(e) => f.set({ sort: e.target.value as SortKey })} sx={{ minWidth: 190 }}>
              {SORTS.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </TextField>
          </Box>
        </Box>

        {chips.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {chips.map((c) => <Chip key={c.label} label={c.label} onDelete={c.clear} />)}
            <Button size="small" onClick={() => f.reset()}>Clear all</Button>
          </Box>
        )}

        {error ? <ErrorNote error={error} onRetry={() => refetch()} /> : isLoading ? <ProductGridSkeleton count={8} /> : data && data.items.length === 0 ? (
          <EmptyState icon={<SearchOffIcon fontSize="large" />} title="No results found" body={f.q ? `We couldn't find anything for "${f.q}". Check the spelling, try a broader term or clear filters.` : 'No items match your filters.'} action={{ label: 'Clear filters', onClick: () => f.set({ ...DEFAULT_FILTERS }) }} />
        ) : data ? (
          <Box sx={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity .2s' }}>
            <ProductGrid products={data.items} />
            {pages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
                <Pagination count={pages} page={f.page} onChange={(_, p) => { f.setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} color="primary" shape="rounded" siblingCount={0} />
              </Box>
            )}
          </Box>
        ) : null}
      </Box>

      <Drawer anchor="bottom" open={filterOpen} onClose={() => setFilterOpen(false)} slotProps={{ paper: { sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88vh' } } }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5" component="h2">Filters</Typography>
          <IconButton aria-label="Close filters" onClick={() => setFilterOpen(false)}><CloseIcon /></IconButton>
        </Box>
        <Divider />
        <Box sx={{ p: 2, overflowY: 'auto' }}><FilterPanel /></Box>
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button fullWidth variant="contained" size="large" onClick={() => setFilterOpen(false)}>Show {data?.total ?? ''} results</Button>
        </Box>
      </Drawer>
    </Box>
  );
}
