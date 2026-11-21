'use client';
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Skeleton from '@mui/material/Skeleton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { brand, shadows } from '@/theme/tokens';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
      <Box>
        <Typography variant="h3" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' }, color: 'primary.dark' }}>{title}</Typography>
        <Box aria-hidden sx={{ width: 44, height: 3, borderRadius: 2, mt: 0.75, background: `linear-gradient(90deg, ${brand.sky}, ${brand.green})` }} />
        {subtitle && <Typography color="text.secondary" variant="body2" sx={{ mt: 0.75 }}>{subtitle}</Typography>}
      </Box>
      {actions && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{actions}</Box>}
    </Box>
  );
}

export function Panel({ title, children, action, sx }: { title?: string; children: ReactNode; action?: ReactNode; sx?: object }) {
  return (
    <Box sx={{ bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 4, boxShadow: shadows.soft, p: { xs: 2, md: 3 }, ...sx }}>
      {(title || action) && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1 }}>
          {title && <Typography variant="h6" component="h2" sx={{ color: 'primary.dark', display: 'flex', alignItems: 'center', gap: 1 }}><Box component="span" aria-hidden sx={{ width: 4, height: 18, borderRadius: 2, background: `linear-gradient(180deg, ${brand.sky}, ${brand.green})` }} />{title}</Typography>}
          {action}
        </Box>
      )}
      {children}
    </Box>
  );
}

export function AccessDenied({ what = 'this section' }: { what?: string }) {
  return (
    <Box role="alert" sx={{ textAlign: 'center', py: 10, display: 'grid', gap: 1.5, justifyItems: 'center' }}>
      <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: '#FDE8E8', color: '#9B1C1C', display: 'grid', placeItems: 'center' }}><LockOutlinedIcon fontSize="large" /></Box>
      <Typography variant="h4" component="h1">Access denied</Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 420 }}>You don&apos;t have permission to view {what}. Ask a Super Admin to update your role if you need access.</Typography>
      <Button component={Link} href="/admin" variant="contained">Back to dashboard</Button>
    </Box>
  );
}

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Shown as the card title on mobile. */
  primary?: boolean;
  hideOnMobile?: boolean;
}

/** Responsive table: classic table from md, stacked cards on phones (no horizontal scrolling). */
export function DataTable<T>({ columns, rows, getId, loading, onRowClick, page, limit, total, onPage, empty = 'Nothing to show yet.' }: {
  columns: Column<T>[]; rows: T[]; getId: (r: T) => string; loading?: boolean; onRowClick?: (r: T) => void;
  page?: number; limit?: number; total?: number; onPage?: (p: number) => void; empty?: string;
}) {
  const cell = (c: Column<T>, r: T) => (c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? '—'));
  const primary = columns.find((c) => c.primary) ?? columns[0];
  return (
    <Box sx={{ bgcolor: '#fff', border: `1px solid ${brand.line}`, borderRadius: 4, overflow: 'hidden', boxShadow: shadows.soft }}>
      <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
        <Table size="medium" aria-label="Data table">
          <TableHead><TableRow>{columns.map((c) => <TableCell key={c.key} align={c.align}>{c.label}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {loading ? Array.from({ length: 6 }).map((_, i) => <TableRow key={i}>{columns.map((c) => <TableCell key={c.key}><Skeleton /></TableCell>)}</TableRow>) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>{empty}</TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={getId(r)} hover={Boolean(onRowClick)} onClick={onRowClick ? () => onRowClick(r) : undefined} sx={{ cursor: onRowClick ? 'pointer' : 'default', transition: 'background .15s', '&:hover': onRowClick ? { bgcolor: `${brand.skyLight}88` } : undefined, '&:nth-of-type(even)': { bgcolor: '#FAFCFE' }, '&:last-child td': { borderBottom: 0 } }}>
                {columns.map((c) => <TableCell key={c.key} align={c.align}>{cell(c, r)}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ display: { xs: 'grid', md: 'none' } }}>
        {loading ? [0, 1, 2, 3].map((i) => <Box key={i} sx={{ p: 2 }}><Skeleton height={24} /><Skeleton width="60%" /></Box>) : rows.length === 0 ? <Typography sx={{ p: 4, textAlign: 'center' }} color="text.secondary">{empty}</Typography> : rows.map((r) => (
          <Box key={getId(r)} onClick={onRowClick ? () => onRowClick(r) : undefined} sx={{ p: 2, borderBottom: `1px solid ${brand.line}`, display: 'grid', gap: 0.75, cursor: onRowClick ? 'pointer' : 'default', '&:last-child': { borderBottom: 0 } }}>
            <Box sx={{ fontWeight: 700 }}>{cell(primary, r)}</Box>
            {columns.filter((c) => c !== primary && !c.hideOnMobile).map((c) => (
              <Box key={c.key} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, fontSize: '0.88rem', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                <Box sx={{ textAlign: 'right', minWidth: 0 }}>{cell(c, r)}</Box>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
      {onPage && total !== undefined && limit && page && (
        <TablePagination component="div" count={total} page={page - 1} rowsPerPage={limit} rowsPerPageOptions={[limit]} onPageChange={(_, p) => onPage(p + 1)} />
      )}
    </Box>
  );
}

export function ConfirmDialog({ open, title, body, confirmLabel = 'Confirm', danger, busy, onConfirm, onClose }: { open: boolean; title: string; body: ReactNode; confirmLabel?: string; danger?: boolean; busy?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent><Typography color="text.secondary" component="div">{body}</Typography></DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color={danger ? 'error' : 'primary'} disabled={busy}>{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}

export function useDisclosure(initial = false) {
  const [open, setOpen] = useState(initial);
  return { open, onOpen: () => setOpen(true), onClose: () => setOpen(false) };
}

export const money = (p: number | null | undefined) => (p === null || p === undefined ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(p / 100));
export const dateTime = (d: string | Date | undefined | null) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
