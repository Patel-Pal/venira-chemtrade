'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Autocomplete from '@mui/material/Autocomplete';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AddIcon from '@mui/icons-material/Add';
import { adminApi, useAdminList, useAdminMutation } from '@/hooks/useAdmin';
import { fieldErrors, get, post } from '@/lib/api-client';
import { useCan } from '@/hooks/useCan';
import { ConfirmDialog, DataTable, PageHeader, type Column } from './ui';
import { brand } from '@/theme/tokens';

export type FieldDef =
  | { name: string; label: string; type: 'text' | 'textarea' | 'number' | 'date' | 'switch' | 'money'; required?: boolean; helper?: string; nullable?: boolean; min?: number; disabledOnEdit?: boolean; transform?: 'upper' | 'lower' }
  | { name: string; label: string; type: 'select'; options: { value: string; label: string }[]; helper?: string; nullable?: boolean; disabledOnEdit?: boolean }
  | { name: string; label: string; type: 'image' | 'categoryIds' | 'productIds' | 'faqs' | 'categoryParent'; helper?: string };

function ImageField({ value, onChange, folder }: { value: any; onChange: (v: any) => void; folder: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const pick = async (f?: File | null) => {
    if (!f) return;
    setBusy(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.set('file', f);
      fd.set('folder', folder);
      const r = await post<{ publicId: string; url: string }>('/api/admin/uploads', fd as unknown as object);
      onChange({ publicId: r.publicId, url: r.url });
    } catch (e) { setErr(e instanceof Error ? e.message : 'Upload failed'); } finally { setBusy(false); }
  };
  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        {value?.url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={value.url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 12, border: `1px solid ${brand.line}` }} />}
        <Button component="label" variant="outlined" disabled={busy}>{busy ? 'Uploading…' : value?.url ? 'Replace image' : 'Upload image'}<input hidden type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => pick(e.target.files?.[0])} /></Button>
        {value?.url && <Button color="error" onClick={() => onChange(null)}>Remove</Button>}
      </Box>
      {err && <Typography color="error" variant="caption">{err}</Typography>}
    </Box>
  );
}

function CategoryMulti({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { data } = useQuery({ queryKey: ['admin', 'categories', 'options'], queryFn: () => get<{ items: { id: string; name: string }[] }>('/api/admin/categories', { limit: 200 }) });
  const opts = data?.items ?? [];
  return <Autocomplete multiple options={opts} getOptionLabel={(o) => o.name} value={opts.filter((o) => value?.includes(o.id))} onChange={(_, v) => onChange(v.map((x) => x.id))} renderInput={(p) => <TextField {...p} label="Restrict to categories (optional)" />} />;
}

function ProductMulti({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState('');
  const { data } = useQuery({ queryKey: ['admin', 'products', 'options', q], queryFn: () => get<{ items: { id: string; name: string }[] }>('/api/admin/products', { search: q || undefined, limit: 20 }), staleTime: 30_000 });
  const [picked, setPicked] = useState<{ id: string; name: string }[]>([]);
  const opts = [...picked, ...(data?.items ?? []).filter((i) => !picked.some((p) => p.id === i.id))];
  return <Autocomplete multiple filterOptions={(x) => x} options={opts} getOptionLabel={(o) => o.name} value={opts.filter((o) => value?.includes(o.id))} onInputChange={(_, v) => setQ(v)} onChange={(_, v) => { setPicked(v); onChange(v.map((x) => x.id)); }} renderInput={(p) => <TextField {...p} label="Restrict to products (optional)" helperText="Search by name" />} />;
}

function ParentSelect({ value, onChange, excludeId }: { value: string | null; onChange: (v: string | null) => void; excludeId?: string }) {
  const { data } = useQuery({ queryKey: ['admin', 'categories', 'options'], queryFn: () => get<{ items: { id: string; name: string }[] }>('/api/admin/categories', { limit: 200 }) });
  return (
    <TextField select label="Parent category" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      <MenuItem value="">None (top level)</MenuItem>
      {(data?.items ?? []).filter((c) => c.id !== excludeId).map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
    </TextField>
  );
}

function FaqEditor({ value = [], onChange }: { value: { question: string; answer: string }[]; onChange: (v: { question: string; answer: string }[]) => void }) {
  return (
    <Stack spacing={1.5}>
      {value.map((f, i) => (
        <Box key={i} sx={{ display: 'grid', gap: 1, p: 1.5, border: `1px solid ${brand.line}`, borderRadius: 3 }}>
          <TextField size="small" label={`Question ${i + 1}`} value={f.question} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} />
          <TextField size="small" label="Answer" multiline minRows={2} value={f.answer} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} />
          <Button size="small" color="error" onClick={() => onChange(value.filter((_, j) => j !== i))} sx={{ justifySelf: 'end' }}>Remove</Button>
        </Box>
      ))}
      <Button onClick={() => onChange([...value, { question: '', answer: '' }])} sx={{ justifySelf: 'start' }}>+ Add question</Button>
    </Stack>
  );
}

const toDateInput = (d: any) => (d ? new Date(d).toISOString().slice(0, 16) : '');

/** Converts API values -> form values. */
function toForm(fields: FieldDef[], item: any, defaults: any) {
  const base: any = { ...defaults };
  if (!item) return base;
  for (const f of fields) {
    const v = item[f.name];
    if (f.type === 'money') base[f.name] = v === null || v === undefined ? '' : String(v / 100);
    else if (f.type === 'date') base[f.name] = toDateInput(v);
    else base[f.name] = v ?? (f.type === 'switch' ? false : f.type === 'text' || f.type === 'textarea' || f.type === 'number' ? '' : base[f.name]);
  }
  return base;
}
/** Converts form values -> API payload (money to paise, empty -> null/undefined, etc.). */
function toPayload(fields: FieldDef[], v: any) {
  const out: any = {};
  for (const f of fields) {
    const raw = v[f.name];
    switch (f.type) {
      case 'money': out[f.name] = raw === '' || raw === undefined || raw === null ? (f.nullable ? null : 0) : Math.round(Number(raw) * 100); break;
      case 'number': out[f.name] = raw === '' || raw === undefined ? (f.nullable ? null : 0) : Number(raw); break;
      case 'date': out[f.name] = raw ? new Date(raw).toISOString() : null; break;
      case 'text': case 'textarea': out[f.name] = f.type === 'text' && f.transform === 'upper' ? String(raw ?? '').toUpperCase() : raw === '' ? undefined : raw; break;
      case 'select': out[f.name] = raw === '' ? (f.nullable ? null : undefined) : raw; break;
      default: out[f.name] = raw;
    }
  }
  return out;
}

export default function ResourceCrud({ resource, title, subtitle, columns, fields, defaults, canWrite, writePerm, itemName = 'item', pageSize = 20, imageFolder = 'misc', extraActions, mapIn, mapOut }: {
  resource: string; title: string; subtitle?: string; columns: Column<any>[]; fields: FieldDef[]; defaults: Record<string, any>;
  canWrite?: boolean; writePerm?: string; itemName?: string; pageSize?: number; imageFolder?: string; extraActions?: React.ReactNode;
  /** Adjust API item -> form values (e.g. paise to rupees). */ mapIn?: (item: any, form: any) => any;
  /** Adjust form-derived payload before sending. */ mapOut?: (payload: any, form: any) => any;
}) {
  const can = useCan();
  const allowed = canWrite ?? (writePerm ? can(writePerm) : true);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<any | 'new' | null>(null);
  const [deleting, setDeleting] = useState<any | null>(null);
  const [formError, setFormError] = useState('');
  const { data, isLoading } = useAdminList<any>(resource, { page, limit: pageSize });
  const save = useAdminMutation(resource, async (body: { id?: string; data: any }) => (body.id ? adminApi.update(resource, body.id, body.data) : adminApi.create(resource, body.data)), `${itemName[0].toUpperCase()}${itemName.slice(1)} saved`);
  const remove = useAdminMutation(resource, (id: string) => adminApi.remove(resource, id), `${itemName[0].toUpperCase()}${itemName.slice(1)} deleted`);

  const isNew = editing === 'new';
  const { control, handleSubmit, reset, setError, formState: { errors } } = useForm<any>({ defaultValues: defaults });
  useEffect(() => { if (editing) { const f0 = toForm(fields, isNew ? null : editing, defaults); reset(mapIn && !isNew ? mapIn(editing, f0) : f0); setFormError(''); } }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const cols: Column<any>[] = [
    ...columns,
    ...(allowed ? [{ key: '_actions', label: '', align: 'right' as const, render: (r: any) => (
      <Box sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
        <IconButton aria-label={`Edit ${itemName}`} onClick={() => setEditing(r)}><EditOutlinedIcon /></IconButton>
        <IconButton aria-label={`Delete ${itemName}`} color="error" onClick={() => setDeleting(r)}><DeleteOutlineIcon /></IconButton>
      </Box>
    ) }] : []),
  ];

  const submit = handleSubmit(async (v) => {
    setFormError('');
    try {
      await save.mutateAsync({ id: isNew ? undefined : editing.id, data: mapOut ? mapOut(toPayload(fields, v), v) : toPayload(fields, v) });
      setEditing(null);
    } catch (e) {
      const fe = fieldErrors(e);
      Object.entries(fe).forEach(([k, m]) => setError(k, { message: m }));
      setFormError(Object.keys(fe).length ? 'Please fix the highlighted fields.' : e instanceof Error ? e.message : 'Could not save');
    }
  });

  return (
    <Box>
      <PageHeader title={title} subtitle={subtitle} actions={<>{extraActions}{allowed && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing('new')}>Add {itemName}</Button>}</>} />
      <DataTable columns={cols} rows={data?.items ?? []} getId={(r) => r.id} loading={isLoading} page={page} limit={data?.limit ?? pageSize} total={data?.total} onPage={setPage} empty={`No ${itemName}s yet.`} />

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle>{isNew ? `Add ${itemName}` : `Edit ${itemName}`}</DialogTitle>
        <Box component="form" onSubmit={submit} noValidate>
          <DialogContent dividers sx={{ display: 'grid', gap: 2 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            {fields.map((f) => (
              <Controller key={f.name} name={f.name} control={control} render={({ field }) => {
                const err = errors[f.name]?.message as string | undefined;
                if (f.type === 'switch') return <FormControlLabel control={<Switch checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} />} label={f.label} />;
                if (f.type === 'select') return <TextField select label={f.label} value={field.value ?? ''} onChange={field.onChange} disabled={!isNew ? f.disabledOnEdit : false} error={Boolean(err)} helperText={err ?? f.helper}>{f.nullable && <MenuItem value="">None</MenuItem>}{f.options.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}</TextField>;
                if (f.type === 'image') return <Box><Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>{f.label}</Typography><ImageField value={field.value} onChange={field.onChange} folder={imageFolder} /></Box>;
                if (f.type === 'categoryIds') return <CategoryMulti value={field.value ?? []} onChange={field.onChange} />;
                if (f.type === 'productIds') return <ProductMulti value={field.value ?? []} onChange={field.onChange} />;
                if (f.type === 'categoryParent') return <ParentSelect value={field.value ?? null} onChange={field.onChange} excludeId={isNew ? undefined : editing?.id} />;
                if (f.type === 'faqs') return <Box><Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>{f.label}</Typography><FaqEditor value={field.value ?? []} onChange={field.onChange} /></Box>;
                const common = { label: f.label, error: Boolean(err), helperText: err ?? f.helper, value: field.value ?? '', onChange: field.onChange, onBlur: field.onBlur, required: (f as any).required, disabled: !isNew && (f as any).disabledOnEdit };
                if (f.type === 'textarea') return <TextField {...common} multiline minRows={4} />;
                if (f.type === 'number' || f.type === 'money') return <TextField {...common} type="number" slotProps={{ htmlInput: { min: f.min ?? 0, step: f.type === 'money' ? '0.01' : '1' }, input: f.type === 'money' ? { startAdornment: <Typography sx={{ mr: 1 }} color="text.secondary">₹</Typography> } : undefined }} />;
                if (f.type === 'date') return <TextField {...common} type="datetime-local" slotProps={{ inputLabel: { shrink: true } }} />;
                return <TextField {...common} onChange={(e) => field.onChange((f as any).transform === 'upper' ? e.target.value.toUpperCase() : e.target.value)} />;
              }} />
            ))}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}><Button onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" variant="contained" disabled={save.isPending}>Save</Button></DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog open={Boolean(deleting)} danger title={`Delete ${itemName}?`} body="This action cannot be undone." confirmLabel="Delete" busy={remove.isPending} onClose={() => setDeleting(null)} onConfirm={async () => { try { await remove.mutateAsync(deleting.id); setDeleting(null); } catch { /* toast shown */ } }} />
    </Box>
  );
}
