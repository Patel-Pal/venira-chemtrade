'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Switch from '@mui/material/Switch';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Divider from '@mui/material/Divider';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { useAdminList } from '@/hooks/useAdmin';
import { get, patch, post, put, del, fieldErrors } from '@/lib/api-client';
import { qk } from '@/lib/query-keys';
import { useUiStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { ConfirmDialog, DataTable, PageHeader, Panel, dateTime, money, type Column } from './ui';
import { ErrorNote, StatusChip } from '@/components/common/ui';
import { brand, shadows } from '@/theme/tokens';
import DashboardView from './DashboardView';

const RevenueChart = dynamic(() => import('./Charts').then((m) => m.RevenueChart), { ssr: false, loading: () => <Skeleton variant="rounded" height={280} /> });

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Box sx={{ bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 4, p: 2.25, boxShadow: shadows.soft, borderTop: `3px solid ${brand.navy}` }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, mt: 0.25 }}>{value}</Typography>
      {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
    </Box>
  );
}

/* ------------------------------ Dashboard ------------------------------ */
export function PlatformDashboard() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: qk.sa.list('dashboard'), queryFn: () => get<any>('/api/super-admin/dashboard'), staleTime: 30_000 });
  if (isLoading) return <Skeleton variant="rounded" height={400} />;
  if (error || !data) return <ErrorNote error={error ?? new Error('Failed')} onRetry={() => refetch()} />;
  return (
    <Box>
      <PageHeader title="Platform overview" subtitle="Everything across the store at a glance." />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2,minmax(0,1fr))', lg: 'repeat(4,minmax(0,1fr))' } }}>
        <Kpi label="Admins" value={String(data.admins)} /><Kpi label="Customers" value={String(data.customers)} /><Kpi label="Products" value={String(data.products)} /><Kpi label="Orders" value={String(data.orders)} />
        <Kpi label="Total revenue" value={money(data.revenuePaise)} /><Kpi label="Successful payments" value={String(data.successfulPayments)} /><Kpi label="Failed payments" value={String(data.failedPayments)} /><Kpi label="Active users" value={String(data.activeUsers)} />
      </Box>
      <Box sx={{ display: 'grid', gap: 2.5, mt: 3, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' } }}>
        <Panel title="Sales trend (30 days)">{data.series.length ? <RevenueChart data={data.series} /> : <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>No paid orders yet.</Typography>}</Panel>
        <Panel title="Recent platform activity">
          {data.activity.length === 0 ? <Typography color="text.secondary">No activity recorded yet.</Typography> : data.activity.map((a: any) => <Box key={a.id} sx={{ py: 1, borderTop: `1px solid ${brand.line}`, '&:first-of-type': { borderTop: 0 } }}><Typography variant="body2" sx={{ fontWeight: 600 }}>{a.action}</Typography><Typography variant="caption" color="text.secondary">{dateTime(a.createdAt)}{a.resourceType ? ` · ${a.resourceType}` : ''}</Typography></Box>)}
        </Panel>
      </Box>
    </Box>
  );
}

export function AnalyticsView() {
  return <DashboardView title="Analytics" />;
}

/* -------------------------------- Admins -------------------------------- */
export function AdminsManager() {
  const qc = useQueryClient();
  const notify = useUiStore((s) => s.notify);
  const me = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [editing, setEditing] = useState<any | 'new' | null>(null);
  const [view, setView] = useState<any | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'reset' | 'revoke'; admin: any } | null>(null);
  const { data, isLoading } = useAdminList<any>('admins', { page, limit: 20, search: term || undefined }, '/api/super-admin/admins');
  const roles = useQuery({ queryKey: qk.sa.list('roles'), queryFn: () => get<{ roles: any[]; permissions: { key: string; description: string }[] }>('/api/super-admin/roles') });
  const [form, setForm] = useState<any>({});
  const [err, setErr] = useState('');
  const open = (a: any | 'new') => { setEditing(a); setErr(''); setForm(a === 'new' ? { name: '', email: '', phone: '', password: '', roleKey: 'admin', extraPermissions: [], status: 'active' } : { name: a.name, phone: a.phone ?? '', roleKey: a.roleKey, extraPermissions: a.extraPermissions ?? [], status: a.status === 'deactivated' ? 'deactivated' : 'active' }); };
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'admins'] });

  const save = useMutation({
    mutationFn: () => {
      const body: any = { name: form.name, phone: form.phone || undefined, roleKey: form.roleKey, extraPermissions: form.extraPermissions, status: form.status };
      if (editing === 'new') return post('/api/super-admin/admins', { ...body, email: form.email, password: form.password || undefined });
      if (form.password) body.password = form.password;
      if (editing.id === me?.id) { delete body.roleKey; delete body.extraPermissions; delete body.status; }
      return patch(`/api/super-admin/admins/${editing.id}`, body);
    },
    onSuccess: () => { notify('Admin saved'); setEditing(null); refresh(); },
    onError: (e: Error) => { const fe = fieldErrors(e); setErr(Object.keys(fe).length ? Object.values(fe).join(', ') : e.message); },
  });
  const access = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'reset' | 'revoke' }) => post(`/api/super-admin/admins/${id}/access`, { action }),
    onSuccess: (_, v) => { notify(v.action === 'reset' ? 'Sessions revoked and reset link sent' : 'Sessions revoked'); setConfirm(null); },
    onError: (e: Error) => notify(e.message, 'error'),
  });
  const loadActivity = async (a: any) => setView({ ...a, loading: true, ...(await get<any>(`/api/super-admin/admins/${a.id}`)) });

  const cols: Column<any>[] = [
    { key: 'name', label: 'Admin', primary: true, render: (a) => <Box><b>{a.name}</b><Typography variant="caption" color="text.secondary" display="block">{a.email}</Typography></Box> },
    { key: 'roleKey', label: 'Role', render: (a) => <Chip size="small" label={a.roleKey.replace(/_/g, ' ')} sx={{ textTransform: 'capitalize' }} /> },
    { key: 'status', label: 'Status', render: (a) => <StatusChip status={a.status} /> },
    { key: 'lastLoginAt', label: 'Last login', hideOnMobile: true, render: (a) => dateTime(a.lastLoginAt) },
    { key: '_a', label: '', align: 'right', render: (a) => <Box sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}><Button size="small" onClick={() => open(a)}>Edit</Button><Button size="small" onClick={() => loadActivity(a)}>Activity</Button><Button size="small" color="warning" onClick={() => setConfirm({ kind: 'revoke', admin: a })}>Revoke</Button><Button size="small" color="warning" onClick={() => setConfirm({ kind: 'reset', admin: a })}>Reset</Button></Box> },
  ];
  const allPerms = roles.data?.permissions ?? [];
  const selectedRole = roles.data?.roles.find((r) => r.key === form.roleKey);

  return (
    <Box>
      <PageHeader title="Admin management" subtitle="Create staff accounts, assign roles and extra permissions, and revoke access." actions={<Button variant="contained" onClick={() => open('new')}>Add admin</Button>} />
      <Box component="form" onSubmit={(e) => { e.preventDefault(); setTerm(search); setPage(1); }} sx={{ display: 'flex', gap: 1.5, mb: 2 }}><TextField size="small" placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1, maxWidth: 360 }} /><Button type="submit" variant="outlined">Search</Button></Box>
      <DataTable columns={cols} rows={data?.items ?? []} getId={(a) => a.id} loading={isLoading} page={page} limit={data?.limit ?? 20} total={data?.total} onPage={setPage} />

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth="sm" fullWidth scroll="paper">
        <DialogTitle>{editing === 'new' ? 'Add admin' : `Edit ${editing?.name ?? ''}`}</DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2 }}>
          {err && <Alert severity="error">{err}</Alert>}
          <TextField label="Name" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {editing === 'new' && <TextField label="Email" type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
          <TextField label="Phone" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <TextField label={editing === 'new' ? 'Initial password (optional)' : 'Set new password (optional)'} type="password" value={form.password ?? ''} onChange={(e) => setForm({ ...form, password: e.target.value })} helperText={editing === 'new' ? 'If empty, the admin receives a link to set their own password.' : 'Leave empty to keep the current password.'} autoComplete="new-password" />
          {editing?.id !== me?.id && (
            <>
              <TextField select label="Role" value={form.roleKey ?? ''} onChange={(e) => setForm({ ...form, roleKey: e.target.value })}>{(roles.data?.roles ?? []).filter((r) => r.key !== 'customer').map((r) => <MenuItem key={r.key} value={r.key}>{r.name}</MenuItem>)}</TextField>
              <TextField select label="Status" value={form.status ?? 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })}><MenuItem value="active">Active</MenuItem><MenuItem value="deactivated">Deactivated</MenuItem></TextField>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>Extra permissions</Typography>
                <Typography variant="caption" color="text.secondary">Granted on top of the role. You can only grant permissions you hold.</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, mt: 1 }}>
                  {allPerms.map((p) => {
                    const inRole = selectedRole?.permissions.includes(p.key) || selectedRole?.key === 'super_admin';
                    return <FormControlLabel key={p.key} label={<Typography variant="body2">{p.key}</Typography>} control={<Checkbox size="small" disabled={inRole} checked={inRole || (form.extraPermissions ?? []).includes(p.key)} onChange={(e) => setForm({ ...form, extraPermissions: e.target.checked ? [...(form.extraPermissions ?? []), p.key] : (form.extraPermissions ?? []).filter((x: string) => x !== p.key) })} />} />;
                  })}
                </Box>
              </Box>
            </>
          )}
          {editing?.id === me?.id && <Alert severity="info">You cannot change your own role, permissions or status.</Alert>}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="contained" disabled={save.isPending} onClick={() => save.mutate()}>Save</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(view)} onClose={() => setView(null)} maxWidth="sm" fullWidth scroll="paper">
        <DialogTitle>{view?.name} – sessions & activity</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>Active sessions ({view?.sessions?.length ?? 0})</Typography>
          {(view?.sessions ?? []).map((s: any) => <Typography key={s.id} variant="caption" display="block" color="text.secondary">{dateTime(s.createdAt)} · {s.ip ?? 'ip n/a'} · {String(s.userAgent ?? '').slice(0, 60)}</Typography>)}
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>Recent activity</Typography>
          {(view?.activity ?? []).length === 0 ? <Typography color="text.secondary" variant="body2">No recorded activity.</Typography> : view.activity.map((a: any) => <Box key={a.id} sx={{ py: 0.75, borderBottom: `1px solid ${brand.line}` }}><Typography variant="body2" sx={{ fontWeight: 600 }}>{a.action}</Typography><Typography variant="caption" color="text.secondary">{dateTime(a.createdAt)}{a.resourceType ? ` · ${a.resourceType} ${a.resourceId ?? ''}` : ''}</Typography></Box>)}
        </DialogContent>
        <DialogActions><Button onClick={() => setView(null)}>Close</Button></DialogActions>
      </Dialog>

      <ConfirmDialog open={Boolean(confirm)} danger title={confirm?.kind === 'reset' ? 'Reset admin access?' : 'Revoke all sessions?'} body={confirm?.kind === 'reset' ? `${confirm?.admin.name} will be signed out everywhere and emailed a password-reset link.` : `${confirm?.admin.name} will be signed out on every device.`} confirmLabel={confirm?.kind === 'reset' ? 'Reset access' : 'Revoke'} busy={access.isPending} onClose={() => setConfirm(null)} onConfirm={() => confirm && access.mutate({ id: confirm.admin.id, action: confirm.kind })} />
    </Box>
  );
}

/* -------------------------------- Roles -------------------------------- */
export function RolesManager() {
  const qc = useQueryClient();
  const notify = useUiStore((s) => s.notify);
  const { data, isLoading, error } = useQuery({ queryKey: qk.sa.list('roles'), queryFn: () => get<{ roles: any[]; permissions: { key: string; description: string }[] }>('/api/super-admin/roles') });
  const [editing, setEditing] = useState<any | 'new' | null>(null);
  const [form, setForm] = useState<any>({ key: '', name: '', description: '', permissions: [] });
  const [err, setErr] = useState('');
  const [deleting, setDeleting] = useState<any | null>(null);
  const open = (r: any | 'new') => { setEditing(r); setErr(''); setForm(r === 'new' ? { key: '', name: '', description: '', permissions: [] } : { key: r.key, name: r.name, description: r.description ?? '', permissions: r.permissions }); };
  const save = useMutation({
    mutationFn: () => (editing === 'new' ? post('/api/super-admin/roles', form) : patch(`/api/super-admin/roles/${editing.id}`, { name: form.name, description: form.description || undefined, permissions: form.permissions })),
    onSuccess: () => { notify('Role saved'); setEditing(null); qc.invalidateQueries({ queryKey: qk.sa.all }); },
    onError: (e: Error) => setErr(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => del(`/api/super-admin/roles/${id}`),
    onSuccess: () => { notify('Role deleted', 'info'); setDeleting(null); qc.invalidateQueries({ queryKey: qk.sa.all }); },
    onError: (e: Error) => { notify(e.message, 'error'); setDeleting(null); },
  });
  if (isLoading) return <Skeleton variant="rounded" height={300} />;
  if (error || !data) return <ErrorNote error={error ?? new Error('Failed')} />;
  const grouped = data.permissions.reduce<Record<string, typeof data.permissions>>((acc, p) => { (acc[p.key.split('.')[0]] ??= []).push(p); return acc; }, {});
  const locked = editing !== 'new' && editing?.key === 'super_admin';

  return (
    <Box>
      <PageHeader title="Roles" subtitle="Each role bundles permissions. Permissions are enforced on the server for every request." actions={<Button variant="contained" onClick={() => open('new')}>Create role</Button>} />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {data.roles.map((r) => (
          <Panel key={r.id}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}><Box><Typography variant="h6">{r.name}</Typography><Typography variant="body2" color="text.secondary">{r.description}</Typography></Box>{r.isSystem && <Chip size="small" label="System" />}</Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>{r.key === 'super_admin' ? 'All permissions' : `${r.permissions.length} permissions`} · {r.userCount} users</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1, maxHeight: 96, overflow: 'hidden' }}>{(r.key === 'super_admin' ? ['*'] : r.permissions.slice(0, 12)).map((p: string) => <Chip key={p} size="small" variant="outlined" label={p} />)}</Box>
            <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
              {r.key !== 'super_admin' && r.key !== 'customer' && <Button size="small" onClick={() => open(r)}>Edit permissions</Button>}
              {!r.isSystem && <Button size="small" color="error" onClick={() => setDeleting(r)}>Delete</Button>}
            </Box>
          </Panel>
        ))}
      </Box>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle>{editing === 'new' ? 'Create role' : `Edit role: ${editing?.name}`}</DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2 }}>
          {err && <Alert severity="error">{err}</Alert>}
          {editing === 'new' && <TextField label="Key (lowercase_with_underscores)" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/[^a-z_]/g, '') })} />}
          <TextField label="Name" value={form.name} disabled={locked} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>Permissions</Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            {Object.entries(grouped).map(([g, ps]) => (
              <Box key={g} sx={{ border: `1px solid ${brand.line}`, borderRadius: 3, p: 1.5 }}>
                <Typography variant="overline" color="info.main" sx={{ textTransform: 'capitalize' }}>{g}</Typography>
                {ps.map((p) => <FormControlLabel key={p.key} sx={{ display: 'flex', m: 0 }} label={<Box><Typography variant="body2" sx={{ fontWeight: 600 }}>{p.key}</Typography><Typography variant="caption" color="text.secondary">{p.description}</Typography></Box>} control={<Checkbox size="small" checked={form.permissions.includes(p.key)} onChange={(e) => setForm({ ...form, permissions: e.target.checked ? [...form.permissions, p.key] : form.permissions.filter((x: string) => x !== p.key) })} />} />)}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="contained" disabled={save.isPending || locked} onClick={() => save.mutate()}>Save role</Button></DialogActions>
      </Dialog>
      <ConfirmDialog open={Boolean(deleting)} danger title="Delete role?" body={`Delete "${deleting?.name}"? Roles that are still assigned cannot be deleted.`} confirmLabel="Delete" busy={remove.isPending} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting.id)} />
    </Box>
  );
}

export function PermissionsMatrix() {
  const { data, isLoading, error } = useQuery({ queryKey: qk.sa.list('roles'), queryFn: () => get<{ roles: any[]; permissions: { key: string; description: string }[] }>('/api/super-admin/roles') });
  if (isLoading) return <Skeleton variant="rounded" height={300} />;
  if (error || !data) return <ErrorNote error={error ?? new Error('Failed')} />;
  const roles = data.roles.filter((r) => r.key !== 'customer');
  return (
    <Box>
      <PageHeader title="Permissions" subtitle="Which roles hold which permissions. Edit assignments from the Roles page." />
      <TableContainer sx={{ bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 4, maxHeight: '70vh' }}>
        <Table stickyHeader size="small" aria-label="Permission matrix">
          <TableHead><TableRow><TableCell>Permission</TableCell>{roles.map((r) => <TableCell key={r.id} align="center">{r.name}</TableCell>)}</TableRow></TableHead>
          <TableBody>{data.permissions.map((p) => (
            <TableRow key={p.key} hover><TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{p.key}</Typography><Typography variant="caption" color="text.secondary">{p.description}</Typography></TableCell>
              {roles.map((r) => <TableCell key={r.id} align="center">{r.key === 'super_admin' || r.permissions.includes(p.key) ? <Chip size="small" color="success" label="✓" /> : <Typography color="text.disabled">–</Typography>}</TableCell>)}</TableRow>
          ))}</TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

/* ------------------------------ Audit logs ------------------------------ */
export function AuditLogs() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [sel, setSel] = useState<any | null>(null);
  const { data, isLoading } = useAdminList<any>('audit', { page, limit: 30, action: action || undefined, resourceType: resourceType || undefined }, '/api/super-admin/audit-logs');
  const cols: Column<any>[] = [
    { key: 'createdAt', label: 'When', primary: true, render: (a) => dateTime(a.createdAt) },
    { key: 'userName', label: 'User', render: (a) => a.userName ?? (a.userId ? a.userId.slice(-6) : 'system') },
    { key: 'action', label: 'Action', render: (a) => <code>{a.action}</code> },
    { key: 'resourceType', label: 'Resource', hideOnMobile: true, render: (a) => `${a.resourceType ?? '—'}${a.resourceId ? ` · ${String(a.resourceId).slice(-8)}` : ''}` },
    { key: 'ip', label: 'IP', hideOnMobile: true },
  ];
  return (
    <Box>
      <PageHeader title="Audit logs" subtitle="Append-only record of logins, admin actions, order and payment events, permission and settings changes." />
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <TextField size="small" label="Action starts with" placeholder="e.g. auth. / order. / role." value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} sx={{ minWidth: 240 }} />
        <TextField select size="small" label="Resource" value={resourceType} onChange={(e) => { setResourceType(e.target.value); setPage(1); }} sx={{ minWidth: 160 }}><MenuItem value="">All</MenuItem>{['user', 'product', 'order', 'payment', 'role', 'settings', 'category', 'coupon', 'review', 'variant'].map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}</TextField>
      </Box>
      <DataTable columns={cols} rows={data?.items ?? []} getId={(a) => a.id} loading={isLoading} onRowClick={setSel} page={page} limit={data?.limit ?? 30} total={data?.total} onPage={setPage} />
      <Dialog open={Boolean(sel)} onClose={() => setSel(null)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle>{sel?.action}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{dateTime(sel?.createdAt)} · user {sel?.userName ?? sel?.userId ?? 'system'} · IP {sel?.ip ?? 'n/a'}</Typography>
          {(['before', 'after', 'meta'] as const).map((k) => sel?.[k] !== undefined && sel?.[k] !== null ? <Box key={k} sx={{ mb: 2 }}><Typography variant="overline" color="text.secondary">{k}</Typography><Box component="pre" sx={{ m: 0, p: 1.5, bgcolor: '#F1F5FA', borderRadius: 2, overflow: 'auto', fontSize: '0.78rem', maxHeight: 260 }}>{JSON.stringify(sel[k], null, 2)}</Box></Box> : null)}
        </DialogContent>
        <DialogActions><Button onClick={() => setSel(null)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
}

/* ---------------------------- System settings ---------------------------- */
export function SystemSettings() {
  const qc = useQueryClient();
  const notify = useUiStore((s) => s.notify);
  const [tab, setTab] = useState(0);
  const { data, isLoading, error } = useQuery({ queryKey: qk.sa.list('system'), queryFn: () => get<any>('/api/super-admin/system') });
  const save = useMutation({
    mutationFn: (b: any) => put('/api/super-admin/system', b),
    onSuccess: () => { notify('Configuration saved'); qc.invalidateQueries({ queryKey: qk.sa.list('system') }); },
    onError: (e: Error) => notify(e.message, 'error'),
  });
  if (isLoading) return <Skeleton variant="rounded" height={300} />;
  if (error || !data) return <ErrorNote error={error ?? new Error('Failed')} />;
  const flags: Record<string, boolean> = data.featureFlags;
  const FLAG_HELP: Record<string, string> = { reviews: 'Customer reviews on product pages', wishlist: 'Wishlist feature', newsletter: 'Newsletter sign-up forms', guestCart: 'Allow shopping before signing in' };
  return (
    <Box>
      <PageHeader title="System configuration" subtitle="Platform-wide switches and integration health." />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}><Tab label="Feature flags" /><Tab label="Integrations" /><Tab label="Runtime" /></Tabs>
      {tab === 0 && (
        <Panel>
          <FormControlLabel control={<Switch checked={Boolean(data.maintenanceMode)} onChange={(e) => save.mutate({ maintenanceMode: e.target.checked })} color="warning" />} label={<Box><Typography sx={{ fontWeight: 700 }}>Maintenance mode</Typography><Typography variant="caption" color="text.secondary">Shows the maintenance page to customers. Staff can still sign in.</Typography></Box>} />
          <Divider sx={{ my: 2 }} />
          {Object.entries(flags).map(([k, v]) => <Box key={k} sx={{ py: 0.5 }}><FormControlLabel control={<Switch checked={v} onChange={(e) => save.mutate({ featureFlags: { [k]: e.target.checked } })} />} label={<Box><Typography sx={{ fontWeight: 600, textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}</Typography><Typography variant="caption" color="text.secondary">{FLAG_HELP[k] ?? 'Feature flag'}</Typography></Box>} /></Box>)}
        </Panel>
      )}
      {tab === 1 && (
        <Panel title="Integration status"><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Secrets live in server environment variables. Only configured/not-configured is shown.</Typography>
          {([['Razorpay API keys', data.integrations.razorpay], ['Razorpay webhook secret', data.integrations.webhookSecret], ['Cloudinary media storage', data.integrations.cloudinary], ['Email provider', data.integrations.email], ['Cron secret (reservation cleanup)', data.integrations.cron]] as [string, boolean][]).map(([l, ok]) => <Box key={l} sx={{ display: 'flex', justifyContent: 'space-between', py: 1.25, borderTop: `1px solid ${brand.line}` }}><Typography>{l}</Typography><Chip size="small" color={ok ? 'success' : 'warning'} label={ok ? 'Configured' : 'Not configured'} /></Box>)}
        </Panel>
      )}
      {tab === 2 && <Panel title="Runtime">{Object.entries(data.runtime).map(([k, v]) => <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderTop: `1px solid ${brand.line}` }}><Typography color="text.secondary">{k}</Typography><Typography sx={{ fontWeight: 600 }}>{String(v)}</Typography></Box>)}</Panel>}
    </Box>
  );
}
