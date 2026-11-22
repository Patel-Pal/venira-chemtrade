'use client';
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Rating from '@mui/material/Rating';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import Link from 'next/link';
import { formatPaise } from '@/utils/money';
import { brand } from '@/theme/tokens';

export function Price({ minPaise, maxPaise, comparePaise, onRequest, size = 'md' }: { minPaise: number | null; maxPaise?: number | null; comparePaise?: number | null; onRequest?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const fs = size === 'lg' ? '1.75rem' : size === 'sm' ? '0.95rem' : '1.1rem';
  if (onRequest || minPaise === null) {
    return <Chip size="small" label="Price on request" sx={{ bgcolor: brand.skyLight, color: brand.navy, fontWeight: 700 }} />;
  }
  const hasDiscount = Boolean(comparePaise && comparePaise > minPaise);
  const pct = hasDiscount ? Math.round((1 - minPaise / comparePaise!) * 100) : 0;
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: size === 'sm' ? 0.75 : 1.25, flexWrap: 'wrap' }}>
      <Typography sx={{ fontWeight: 800, fontSize: fs, color: 'text.primary' }}>
        {maxPaise && maxPaise !== minPaise ? `${formatPaise(minPaise)} - ${formatPaise(maxPaise)}` : formatPaise(minPaise)}
      </Typography>
      {hasDiscount && (
        <>
          <Typography component="span" aria-label={`MRP ${formatPaise(comparePaise!)}`} sx={{ textDecoration: 'line-through', color: 'text.secondary', fontSize: size === 'lg' ? '1.05rem' : '0.85rem' }}>{formatPaise(comparePaise!)}</Typography>
          {pct > 0 && <Typography component="span" sx={{ color: '#1E8E3E', fontWeight: 800, fontSize: size === 'lg' ? '1.05rem' : '0.82rem' }}>{pct}% off</Typography>}
        </>
      )}
    </Box>
  );
}

export function Stars({ value, count, size = 'small' }: { value: number; count?: number; size?: 'small' | 'medium' }) {
  if (!count) return null;
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      <Rating value={value} precision={0.1} readOnly size={size} aria-label={`${value} out of 5 stars`} />
      <Typography variant="caption" color="text.secondary">({count})</Typography>
    </Box>
  );
}

export function QuantityStepper({ value, onChange, min = 1, max = 10_000, size = 'md' }: { value: number; onChange: (n: number) => void; min?: number; max?: number; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 36 : 44;
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${brand.line}`, borderRadius: 3, bgcolor: '#fff' }} role="group" aria-label="Quantity">
      <IconButton aria-label="Decrease quantity" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} sx={{ width: dim, height: dim, minWidth: 0, minHeight: 0 }}>
        <RemoveIcon fontSize="small" />
      </IconButton>
      <Typography component="span" sx={{ minWidth: 36, textAlign: 'center', fontWeight: 700 }} aria-live="polite">{value}</Typography>
      <IconButton aria-label="Increase quantity" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} sx={{ width: dim, height: dim, minWidth: 0, minHeight: 0 }}>
        <AddIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

export function SectionHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: { label: string; href: string } }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, mb: { xs: 2.5, md: 4 } }}>
      <Box sx={{ minWidth: 0 }}>
        {eyebrow && (
          <Typography variant="overline" sx={{ color: 'info.main', display: 'inline-flex', alignItems: 'center', gap: 1 }}>
            <Box component="span" aria-hidden sx={{ width: 24, height: 3, borderRadius: 2, background: `linear-gradient(90deg, ${brand.sky}, ${brand.green})` }} />
            {eyebrow}
          </Typography>
        )}
        <Typography variant="h2" component="h2" sx={{ fontSize: { xs: '1.6rem', md: '2.3rem' }, color: 'primary.dark' }}>{title}</Typography>
        {subtitle && <Typography variant="subtitle1" sx={{ mt: 0.75, maxWidth: 640 }}>{subtitle}</Typography>}
      </Box>
      {action && (
        <Button component={Link} href={action.href} variant="text" sx={{ flexShrink: 0, display: { xs: 'none', sm: 'inline-flex' } }}>
          {action.label} →
        </Button>
      )}
    </Box>
  );
}

export function PageTitle({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: { xs: 3, md: 4 }, p: { xs: 2, md: 3 }, borderRadius: 5, border: `1px solid ${brand.line}`, background: `radial-gradient(500px 200px at 100% 0%, ${brand.skyLight}, transparent 70%), radial-gradient(400px 200px at 0% 100%, ${brand.greenLight}, transparent 70%), #fff` }}>
      {icon && <Box aria-hidden sx={{ flexShrink: 0, width: 52, height: 52, borderRadius: 3.5, display: 'grid', placeItems: 'center', color: '#fff', background: `linear-gradient(135deg, ${brand.navy}, ${brand.sky})`, boxShadow: '0 6px 16px rgba(43,82,144,.28)' }}>{icon}</Box>}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2.2rem' }, color: 'primary.dark' }}>{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{subtitle}</Typography>}
      </Box>
    </Box>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: { label: string; href?: string; onClick?: () => void } }) {
  return (
    <Box sx={{ textAlign: 'center', py: { xs: 6, md: 10 }, px: 2, display: 'grid', placeItems: 'center', gap: 1.5 }}>
      {icon && <Box sx={{ width: 76, height: 76, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: brand.skyLight, color: brand.navy }}>{icon}</Box>}
      <Typography variant="h4" component="h2">{title}</Typography>
      {body && <Typography color="text.secondary" sx={{ maxWidth: 440 }}>{body}</Typography>}
      {action && (action.href ? <Button component={Link} href={action.href} variant="contained" size="large">{action.label}</Button> : <Button variant="contained" size="large" onClick={action.onClick}>{action.label}</Button>)}
    </Box>
  );
}

export function ErrorNote({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <Alert severity="error" action={onRetry ? <Button color="inherit" size="small" onClick={onRetry}>Retry</Button> : undefined} sx={{ borderRadius: 3 }}>
      {msg}
    </Alert>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <Box sx={{ display: 'grid', gap: { xs: 1.5, md: 3 }, gridTemplateColumns: { xs: 'repeat(2, minmax(0,1fr))', md: 'repeat(3, minmax(0,1fr))', lg: 'repeat(4, minmax(0,1fr))' } }}>
      {Array.from({ length: count }).map((_, i) => (
        <Box key={i}>
          <Skeleton variant="rounded" sx={{ aspectRatio: '1 / 1', height: 'auto', borderRadius: 4 }} />
          <Skeleton width="40%" sx={{ mt: 1.5 }} />
          <Skeleton width="85%" />
          <Skeleton width="50%" />
        </Box>
      ))}
    </Box>
  );
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  published: { bg: '#E6F4EA', fg: '#1E6B35' }, active: { bg: '#E6F4EA', fg: '#1E6B35' }, paid: { bg: '#E6F4EA', fg: '#1E6B35' }, captured: { bg: '#E6F4EA', fg: '#1E6B35' },
  delivered: { bg: '#E6F4EA', fg: '#1E6B35' }, approved: { bg: '#E6F4EA', fg: '#1E6B35' }, processed: { bg: '#E6F4EA', fg: '#1E6B35' }, ok: { bg: '#E6F4EA', fg: '#1E6B35' },
  draft: { bg: '#EEF1F6', fg: '#4A5A72' }, created: { bg: '#EEF1F6', fg: '#4A5A72' }, pending: { bg: '#FFF4DB', fg: '#8A5A00' }, payment_pending: { bg: '#FFF4DB', fg: '#8A5A00' }, unpaid: { bg: '#FFF4DB', fg: '#8A5A00' },
  low: { bg: '#FFF4DB', fg: '#8A5A00' }, confirmed: { bg: '#E3F2F8', fg: '#1B5F7A' }, processing: { bg: '#E3F2F8', fg: '#1B5F7A' }, packed: { bg: '#E3F2F8', fg: '#1B5F7A' },
  shipped: { bg: '#E6ECF9', fg: '#2B4C9A' }, out_for_delivery: { bg: '#E6ECF9', fg: '#2B4C9A' }, authorized: { bg: '#E6ECF9', fg: '#2B4C9A' },
  cancelled: { bg: '#FDE8E8', fg: '#9B1C1C' }, failed: { bg: '#FDE8E8', fg: '#9B1C1C' }, rejected: { bg: '#FDE8E8', fg: '#9B1C1C' }, blocked: { bg: '#FDE8E8', fg: '#9B1C1C' }, out: { bg: '#FDE8E8', fg: '#9B1C1C' },
  deactivated: { bg: '#FDE8E8', fg: '#9B1C1C' }, returned: { bg: '#F3E8FD', fg: '#6B21A8' }, refunded: { bg: '#F3E8FD', fg: '#6B21A8' }, partially_refunded: { bg: '#F3E8FD', fg: '#6B21A8' }, archived: { bg: '#EEF1F6', fg: '#4A5A72' },
};
export function StatusChip({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: '#EEF1F6', fg: '#4A5A72' };
  return <Chip size="small" label={status.replace(/_/g, ' ')} sx={{ bgcolor: c.bg, color: c.fg, textTransform: 'capitalize', fontWeight: 700 }} />;
}
