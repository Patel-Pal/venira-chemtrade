'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AddIcon from '@mui/icons-material/Add';
import { fieldErrors, get, post, put, api, del } from '@/lib/api-client';
import { useUiStore } from '@/stores/ui.store';
import { useCan } from '@/hooks/useCan';
import { PageHeader, Panel } from './ui';
import { optimizedImage } from '@/utils/image';
import { brand } from '@/theme/tokens';

interface AdminProduct {
  product: any;
  images: { id: string; url: string; publicId: string; alt?: string; displayOrder: number }[];
  variants: any[];
}

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const rupees = (p: number | null | undefined) => (p === null || p === undefined ? '' : String(p / 100));
const toPaise = (v: string) => (v === '' || v === undefined || v === null ? null : Math.round(Number(v) * 100));

function Images({ productId, images }: { productId: string; images: AdminProduct['images'] }) {
  const qc = useQueryClient();
  const notify = useUiStore((s) => s.notify);
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'product', productId] });
  const run = async (fn: () => Promise<unknown>, ok: string) => { setBusy(true); try { await fn(); notify(ok); refresh(); } catch (e) { notify(e instanceof Error ? e.message : 'Failed', 'error'); } finally { setBusy(false); } };

  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('files', f));
    run(() => api(`/api/admin/products/${productId}/images`, { method: 'POST', body: fd }), 'Images uploaded');
  };
  const move = (i: number, dir: -1 | 1) => {
    const order = images.map((x) => x.id);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    run(() => put(`/api/admin/products/${productId}/images`, { order }), 'Order updated');
  };
  const replace = (id: string, f?: File | null) => {
    if (!f) return;
    const fd = new FormData();
    fd.set('file', f);
    run(() => api(`/api/admin/images/${id}`, { method: 'PUT', body: fd }), 'Image replaced');
  };

  return (
    <Panel title="Images" action={<Button component="label" variant="outlined" size="small" disabled={busy} startIcon={<AddIcon />}>Upload<input hidden multiple type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => { upload(e.target.files); e.target.value = ''; }} /></Button>}>
      <Typography variant="caption" color="text.secondary">JPEG, PNG, WebP or AVIF · max 5 MB each · up to 10 images. The first image is the main product photo.</Typography>
      {images.length === 0 ? <Alert severity="info" sx={{ mt: 1.5 }}>No images yet. A branded placeholder is shown in the store until you upload one.</Alert> : (
        <Box sx={{ display: 'grid', gap: 1.5, mt: 1.5, gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' } }}>
          {images.map((im, i) => (
            <Box key={im.id} sx={{ border: `1px solid ${brand.line}`, borderRadius: 3, overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={optimizedImage(im.url, 300)} alt={im.alt ?? ''} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 0.5 }}>
                {i === 0 ? <Chip size="small" label="Main" color="primary" /> : <span />}
                <Box>
                  <IconButton size="small" aria-label="Move earlier" disabled={busy || i === 0} onClick={() => move(i, -1)}><ArrowUpwardIcon fontSize="small" /></IconButton>
                  <IconButton size="small" aria-label="Move later" disabled={busy || i === images.length - 1} onClick={() => move(i, 1)}><ArrowDownwardIcon fontSize="small" /></IconButton>
                  <IconButton size="small" aria-label="Replace image" component="label" disabled={busy}><SwapHorizIcon fontSize="small" /><input hidden type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => { replace(im.id, e.target.files?.[0]); e.target.value = ''; }} /></IconButton>
                  <IconButton size="small" color="error" aria-label="Delete image" disabled={busy} onClick={() => window.confirm('Delete this image?') && run(() => del(`/api/admin/images/${im.id}`), 'Image deleted')}><DeleteOutlineIcon fontSize="small" /></IconButton>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Panel>
  );
}

export default function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const notify = useUiStore((s) => s.notify);
  const can = useCan();
  const canSave = productId ? can('products.update') : can('products.create');
  const [error, setError] = useState('');

  const { data: cats } = useQuery({ queryKey: ['admin', 'categories', 'options'], queryFn: () => get<{ items: { id: string; name: string }[] }>('/api/admin/categories', { limit: 200 }) });
  const { data: loaded, isLoading } = useQuery({ queryKey: ['admin', 'product', productId], queryFn: () => get<AdminProduct>(`/api/admin/products/${productId}`), enabled: Boolean(productId) });

  const initial = loaded
    ? {
        name: loaded.product.name, slug: loaded.product.slug, categoryId: loaded.product.categoryId, status: loaded.product.status, dataStatus: loaded.product.dataStatus,
        shortDescription: loaded.product.shortDescription ?? '', description: loaded.product.description ?? '', benefits: (loaded.product.benefits ?? []).join('\n'),
        ingredients: (loaded.product.ingredients ?? []).join('\n'), howToUse: loaded.product.howToUse ?? '', specifications: loaded.product.specifications ?? [],
        tags: (loaded.product.tags ?? []).join(', '), isFeatured: loaded.product.isFeatured, isBestSeller: loaded.product.isBestSeller, isNewArrival: loaded.product.isNewArrival,
        seoTitle: loaded.product.seo?.title ?? '', seoDescription: loaded.product.seo?.description ?? '',
        variants: loaded.variants.filter((v: any) => v.isActive).map((v: any) => ({ id: v.id, sku: v.sku, label: v.label, price: rupees(v.pricePaise), compareAt: rupees(v.compareAtPricePaise), trackInventory: v.trackInventory, isActive: v.isActive, stock: v.stock?.onHand ?? '', initialStock: '' })),
      }
    : { name: '', slug: '', categoryId: '', status: 'draft', dataStatus: 'verified', shortDescription: '', description: '', benefits: '', ingredients: '', howToUse: '', specifications: [], tags: '', isFeatured: false, isBestSeller: false, isNewArrival: false, seoTitle: '', seoDescription: '', variants: [{ id: undefined, sku: '', label: 'Standard', price: '', compareAt: '', trackInventory: true, isActive: true, stock: '', initialStock: '' }] };

  const { control, register, handleSubmit, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<any>({ values: initial });
  const specs = useFieldArray({ control, name: 'specifications' });
  const vars = useFieldArray({ control, name: 'variants' });

  const submit = handleSubmit(async (v) => {
    setError('');
    const payload = {
      name: v.name, slug: v.slug || undefined, categoryId: v.categoryId, status: v.status, dataStatus: v.dataStatus,
      shortDescription: v.shortDescription || undefined, description: v.description || undefined, benefits: lines(v.benefits), ingredients: lines(v.ingredients),
      howToUse: v.howToUse || undefined, specifications: (v.specifications ?? []).filter((s: any) => s.label && s.value), tags: String(v.tags).split(',').map((t) => t.trim()).filter(Boolean),
      isFeatured: v.isFeatured, isBestSeller: v.isBestSeller, isNewArrival: v.isNewArrival, seo: { title: v.seoTitle || undefined, description: v.seoDescription || undefined },
      variants: (v.variants ?? []).map((x: any, i: number) => ({
        id: x.id || undefined, sku: x.sku || undefined, label: x.label, pricePaise: toPaise(x.price), compareAtPricePaise: toPaise(x.compareAt),
        trackInventory: Boolean(x.trackInventory), isActive: true, displayOrder: i, initialStock: x.initialStock === '' || x.initialStock === undefined ? undefined : Number(x.initialStock),
      })),
    };
    try {
      if (productId) { await put(`/api/admin/products/${productId}`, payload); notify('Product saved'); qc.invalidateQueries({ queryKey: ['admin'] }); }
      else { const p = await post<{ id: string }>('/api/admin/products', payload); notify('Product created'); qc.invalidateQueries({ queryKey: ['admin', 'products'] }); router.replace(`/admin/products/${p.id}`); }
    } catch (e) {
      const fe = fieldErrors(e);
      Object.entries(fe).forEach(([k, m]) => setFieldError(k, { message: m }));
      setError(Object.keys(fe).length ? `Please fix: ${Object.entries(fe).map(([k, m]) => `${k} (${m})`).join('; ')}` : e instanceof Error ? e.message : 'Could not save');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  if (productId && isLoading) return <Typography>Loading…</Typography>;
  const err = (n: string) => ({ error: Boolean(errors[n]), helperText: errors[n]?.message as string | undefined });

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <PageHeader title={productId ? 'Edit product' : 'New product'} subtitle={productId ? loaded?.product.name : 'Create a catalogue entry'} actions={<><Button onClick={() => router.push('/admin/products')}>Back</Button>{canSave && <Button type="submit" variant="contained" disabled={isSubmitting}>Save product</Button>}</>} />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loaded?.product.dataStatus === 'pending_admin_input' && <Alert severity="warning" sx={{ mb: 2 }}>This entry was imported from the supplier catalogue with only a name. Add the description, specifications, pack sizes and prices, then set &quot;Information status&quot; to Verified.</Alert>}

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, alignItems: 'start' }}>
        <Box sx={{ display: 'grid', gap: 2.5 }}>
          <Panel title="Basic information">
            <Box sx={{ display: 'grid', gap: 2 }}>
              <TextField label="Product name" required {...register('name')} {...err('name')} />
              <TextField label="Short description" multiline minRows={2} {...register('shortDescription')} {...err('shortDescription')} helperText={(errors.shortDescription?.message as string) ?? 'Shown on cards and search results'} />
              <TextField label="Description" multiline minRows={5} {...register('description')} {...err('description')} />
              <TextField label="Benefits (one per line)" multiline minRows={3} {...register('benefits')} helperText="Only add benefits supplied or approved by the company." />
              <TextField label="Ingredients (one per line)" multiline minRows={3} {...register('ingredients')} />
              <TextField label="How to use" multiline minRows={3} {...register('howToUse')} {...err('howToUse')} />
              <TextField label="Tags (comma separated)" {...register('tags')} />
            </Box>
          </Panel>

          <Panel title="Specifications" action={<Button size="small" startIcon={<AddIcon />} onClick={() => specs.append({ label: '', value: '' })}>Add row</Button>}>
            {specs.fields.length === 0 && <Typography color="text.secondary" variant="body2">No specifications yet (e.g. Appearance, Purity, Grade, CAS No.).</Typography>}
            {specs.fields.map((f, i) => (
              <Box key={f.id} sx={{ display: 'grid', gap: 1, gridTemplateColumns: '1fr 1.4fr auto', mb: 1 }}>
                <TextField size="small" label="Label" {...register(`specifications.${i}.label`)} />
                <TextField size="small" label="Value" {...register(`specifications.${i}.value`)} />
                <IconButton aria-label="Remove row" onClick={() => specs.remove(i)}><DeleteOutlineIcon /></IconButton>
              </Box>
            ))}
          </Panel>

          <Panel title="Variants, pricing & stock" action={<Button size="small" startIcon={<AddIcon />} onClick={() => vars.append({ id: undefined, sku: '', label: '', price: '', compareAt: '', trackInventory: true, isActive: true, stock: '', initialStock: '' })}>Add variant</Button>}>
            <Typography variant="caption" color="text.secondary">Leave price empty for &quot;price on request&quot;. SKUs are generated automatically when left empty. Current stock is changed from the Inventory page.</Typography>
            {vars.fields.map((f, i) => (
              <Box key={f.id} sx={{ mt: 2, p: 2, border: `1px solid ${brand.line}`, borderRadius: 3, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
                <TextField size="small" label="Label / size" required {...register(`variants.${i}.label`)} />
                <TextField size="small" label="SKU" {...register(`variants.${i}.sku`)} helperText={(errors as any)?.variants?.[i]?.sku?.message ?? 'Auto if empty'} />
                <TextField size="small" label="Price (₹)" type="number" slotProps={{ htmlInput: { min: 0, step: '0.01' } }} {...register(`variants.${i}.price`)} />
                <TextField size="small" label="Compare-at price (₹)" type="number" slotProps={{ htmlInput: { min: 0, step: '0.01' } }} {...register(`variants.${i}.compareAt`)} />
                <Controller name={`variants.${i}.trackInventory`} control={control} render={({ field }) => <FormControlLabel control={<Switch checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} />} label="Track stock" />} />
                {!(f as any).id && <TextField size="small" label="Opening stock" type="number" slotProps={{ htmlInput: { min: 0 } }} {...register(`variants.${i}.initialStock`)} />}
                {(f as any).id && <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>On hand: {String((f as any).stock ?? '—')}</Typography>}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gridColumn: { md: 'span 2' } }}>
                  <Button size="small" color="error" disabled={vars.fields.length <= 1} onClick={() => vars.remove(i)}>Remove</Button>
                </Box>
              </Box>
            ))}
          </Panel>

          {productId && loaded && <Images productId={productId} images={loaded.images} />}
          {!productId && <Alert severity="info">Save the product first, then you can upload images.</Alert>}
        </Box>

        <Box sx={{ display: 'grid', gap: 2.5 }}>
          <Panel title="Publishing">
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Controller name="status" control={control} render={({ field }) => <TextField select label="Status" {...field}><MenuItem value="draft">Draft</MenuItem><MenuItem value="published">Published</MenuItem><MenuItem value="archived">Archived</MenuItem></TextField>} />
              <Controller name="dataStatus" control={control} render={({ field }) => <TextField select label="Information status" {...field}><MenuItem value="verified">Verified</MenuItem><MenuItem value="pending_admin_input">Pending admin input</MenuItem></TextField>} />
              <Controller name="categoryId" control={control} render={({ field }) => <TextField select label="Category" required {...field} {...err('categoryId')}>{(cats?.items ?? []).map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</TextField>} />
              <Controller name="isFeatured" control={control} render={({ field }) => <FormControlLabel control={<Switch checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} />} label="Featured (Recommended section)" />} />
              <Controller name="isBestSeller" control={control} render={({ field }) => <FormControlLabel control={<Switch checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} />} label="Best seller" />} />
              <Controller name="isNewArrival" control={control} render={({ field }) => <FormControlLabel control={<Switch checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} />} label="New arrival" />} />
            </Box>
          </Panel>
          <Panel title="SEO">
            <Box sx={{ display: 'grid', gap: 2 }}>
              <TextField label="URL slug" {...register('slug')} helperText="Auto-generated from the name when empty" />
              <TextField label="SEO title" {...register('seoTitle')} helperText="Up to 70 characters" />
              <TextField label="SEO description" multiline minRows={3} {...register('seoDescription')} helperText="Up to 170 characters" />
            </Box>
          </Panel>
        </Box>
      </Box>
    </Box>
  );
}
