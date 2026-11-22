'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
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
import { prefetchProducts, useCategories, useProducts, type CategoryDTO, type Paged } from '@/hooks/useCatalog';
import type { ProductCardDTO } from '@/modules/products/catalog.service';
import { PAGE_SIZE, toListParams, type ListFilters, type ListParams } from '@/lib/list-params';
import { ProductGrid } from './ProductCard';
import CategoryChips from '@/components/navigation/CategoryChips';
import { EmptyState, ErrorNote, ProductGridSkeleton } from '@/components/common/ui';
import { DEFAULT_FILTERS, useFilterStore, type SortKey } from '@/stores/filter.store';
import { useUiStore } from '@/stores/ui.store';
import { brand, shadows } from '@/theme/tokens';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'popularity', label: 'Popularity' },
  { value: 'rating', label: 'Customer rating' },
];

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

function FilterPanel({ onApply, view }: { onApply?: () => void; view?: Partial<ListFilters> }) {
  const live = useFilterStore();
  const f = view ? { ...live, ...view } : live;
  const { data: cats = [] } = useCategories();
  const roots = cats.filter((c) => !c.parentId);
  const [min, setMin] = useState(f.minPrice);
  const [max, setMax] = useState(f.maxPrice);
  useEffect(() => { setMin(f.minPrice); setMax(f.maxPrice); }, [f.minPrice, f.maxPrice]);

  return (
    <Box component="section" aria-label="Filters">
      <FilterGroup title="Category">
        <List dense disablePadding>
          <ListItemButton selected={!f.category} onClick={() => { f.set({ category: '' }); onApply?.(); }} sx={{ borderRadius: 2, minHeight: 40, '&.Mui-selected': { bgcolor: brand.skyLight, color: brand.navy, fontWeight: 700 } }}>
            <ListItemText primary="All categories" />
          </ListItemButton>
          {roots.map((c) => (
            <Box key={c.id}>
              <ListItemButton selected={f.category === c.slug} onClick={() => { f.set({ category: c.slug }); onApply?.(); }} sx={{ borderRadius: 2, minHeight: 40, '&.Mui-selected': { bgcolor: brand.skyLight, color: brand.navy } }}>
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
interface ListingProps {
  title?: string;
  /** Everything below comes from the server render of the same URL (see app/(store)/products/page.tsx). */
  initialParams: ListParams;
  initialFilters: ListFilters;
  initialPage: number;
  initialData?: Paged<ProductCardDTO>;
  initialCategories?: CategoryDTO[];
}

export default function ProductListing({ title = 'All ingredients', initialParams, initialFilters, initialPage, initialData, initialCategories }: ListingProps) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const qc = useQueryClient();
  const live = useFilterStore();
  // Until the client store has read the URL (one effect tick) show what the server rendered, so nothing flickers.
  const [ready, setReady] = useState(false);
  const f = ready ? live : { ...live, ...initialFilters, page: initialPage };
  const filterOpen = useUiStore((s) => s.filterOpen);
  const setFilterOpen = useUiStore((s) => s.setFilterOpen);
  const hydrated = useRef(false);
  const { data: cats = [] } = useCategories(true, initialCategories);

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
    setReady(true);
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
    () => (ready ? toListParams({ q: f.q, category: f.category, minPrice: f.minPrice, maxPrice: f.maxPrice, inStock: f.inStock, minRating: f.minRating, sort: f.sort }, f.page) : initialParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, f.page, f.sort, f.q, f.category, f.minPrice, f.maxPrice, f.inStock, f.minRating, initialParams],
  );

  // Keep the address bar in sync WITHOUT a Next navigation (router.replace would re-run the server page on every filter change).
  useEffect(() => {
    if (!ready) return;
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && !(k === 'limit') && !(k === 'page' && v === 1) && !(k === 'sort' && v === 'newest') && qs.set(k, String(v)));
    const next = qs.toString() ? `${pathname}?${qs}` : pathname;
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, '', next);
  }, [ready, params, pathname]);

  // Reuse the server-rendered page only while the params are exactly the ones it was rendered for.
  const sameAsServer = JSON.stringify(params) === JSON.stringify(initialParams);
  const { data, isLoading, isFetching, error, refetch } = useProducts(params, true, sameAsServer ? initialData : undefined);
  const activeCategory = cats.find((c) => c.slug === f.category);
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  // Warm the next page in the background so pressing 'next' is instant.
  useEffect(() => {
    if (data && params.page < pages) void prefetchProducts(qc, { ...params, page: params.page + 1 });
  }, [data, pages, params, qc]);
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
      <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'sticky', top: 100, bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 5, p: 2.5, boxShadow: shadows.soft, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
        <FilterPanel view={f} />
      </Box>

      <Box sx={{ minWidth: 0 }}>
        {/* Phones: one-tap category filter (the desktop sidebar already lists categories). */}
        <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 1.5 }}>
          <CategoryChips activeSlug={f.category} onSelect={(slug) => f.set({ category: slug })} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 2.5, flexWrap: 'wrap', p: { xs: 2, md: 3 }, borderRadius: 5, border: `1px solid ${brand.line}`, background: `radial-gradient(500px 200px at 100% 0%, ${brand.skyLight}, transparent 70%), radial-gradient(400px 200px at 0% 100%, ${brand.greenLight}, transparent 70%), #fff`, boxShadow: shadows.soft }}>
          <Box>
            <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2.2rem' }, color: 'primary.dark' }}>{activeCategory?.name ?? (f.q ? `Results for "${f.q}"` : title)}</Typography>
            <Chip size="small" label={data ? `${data.total} ${data.total === 1 ? 'item' : 'items'}` : 'Loading…'} aria-live="polite" sx={{ mt: 0.75, bgcolor: '#fff', border: `1px solid ${brand.line}`, color: 'text.secondary' }} />
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
        <Box sx={{ p: 2, overflowY: 'auto' }}><FilterPanel view={f} /></Box>
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button fullWidth variant="contained" size="large" onClick={() => setFilterOpen(false)}>Show {data?.total ?? ''} results</Button>
        </Box>
      </Drawer>
    </Box>
  );
}
