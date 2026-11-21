'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import TextField from '@mui/material/TextField';
import Skeleton from '@mui/material/Skeleton';
import Chip from '@mui/material/Chip';
import { get } from '@/lib/api-client';
import { qk } from '@/lib/query-keys';
import { Column, DataTable, PageHeader, Panel, dateTime, money } from './ui';
import { ErrorNote, StatusChip } from '@/components/common/ui';
import { brand, shadows } from '@/theme/tokens';

const RevenueChart = dynamic(() => import('./Charts').then((m) => m.RevenueChart), { ssr: false, loading: () => <Skeleton variant="rounded" height={280} /> });
const OrdersBar = dynamic(() => import('./Charts').then((m) => m.OrdersBar), { ssr: false, loading: () => <Skeleton variant="rounded" height={240} /> });
const StatusPie = dynamic(() => import('./Charts').then((m) => m.StatusPie), { ssr: false, loading: () => <Skeleton variant="rounded" height={260} /> });

export interface DashboardData {
  range: { from: string; to: string };
  totals: { salesPaise: number; todayPaise: number; monthPaise: number; periodPaise: number };
  orders: { total: number; period: number; pending: number; avgOrderPaise: number };
  customers: number; products: number; lowStock: number; outOfStock: number;
  series: { date: string; revenuePaise: number; orders: number }[];
  statuses: { status: string; count: number }[];
  topProducts: { productId: string; name: string; quantity: number; revenuePaise: number }[];
  recentOrders: { id: string; orderNumber: string; totalPaise: number; status: string; paymentStatus: string; createdAt: string; customer: string }[];
}

const RANGES = [['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['month', 'This month'], ['custom', 'Custom']] as const;

function Kpi({ label, value, hint, tone = 'navy', highlight = false }: { label: string; value: string; hint?: string; tone?: 'navy' | 'sky' | 'green' | 'warn'; highlight?: boolean }) {
  const color = { navy: brand.navy, sky: '#2B88A6', green: brand.greenDark, warn: '#B45309' }[tone];
  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', border: `1px solid ${highlight ? brand.navy : brand.line}`, borderRadius: 4, p: 2.25, boxShadow: shadows.soft, ...(highlight ? { background: `linear-gradient(135deg, ${brand.navy}, ${brand.navyDark})`, color: '#fff' } : { bgcolor: '#fff', borderTop: `3px solid ${color}` }) }}>
      {highlight && <Box aria-hidden component="svg" viewBox="0 0 100 100" sx={{ position: 'absolute', right: -14, bottom: -18, width: 110, height: 110, opacity: 0.15 }}><polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill="none" stroke="#fff" strokeWidth="4" strokeLinejoin="round" /></Box>}
      <Typography variant="caption" sx={{ fontWeight: 600, color: highlight ? 'rgba(255,255,255,.8)' : 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ fontSize: { xs: '1.35rem', md: '1.6rem' }, fontWeight: 800, color: highlight ? '#fff' : 'text.primary', mt: 0.25, position: 'relative' }}>{value}</Typography>
      {hint && <Typography variant="caption" sx={{ color: highlight ? 'rgba(255,255,255,.75)' : 'text.secondary' }}>{hint}</Typography>}
    </Box>
  );
}
export default function DashboardView({ base = '/api/admin/dashboard', title = 'Dashboard' }: { base?: string; title?: string }) {
  const router = useRouter();
  const [range, setRange] = useState<string>('30d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const params = { range, from: range === 'custom' ? from || undefined : undefined, to: range === 'custom' ? to || undefined : undefined };
  const { data, isLoading, error, refetch } = useQuery({ queryKey: qk.admin.dashboard(params), queryFn: () => get<DashboardData>(base, params), staleTime: 30_000, placeholderData: (p) => p });

  const orderCols: Column<DashboardData['recentOrders'][number]>[] = [
    { key: 'orderNumber', label: 'Order', primary: true, render: (o) => <b>{o.orderNumber}</b> },
    { key: 'customer', label: 'Customer' },
    { key: 'totalPaise', label: 'Total', align: 'right', render: (o) => money(o.totalPaise) },
    { key: 'status', label: 'Status', render: (o) => <StatusChip status={o.status} /> },
    { key: 'createdAt', label: 'Date', hideOnMobile: true, render: (o) => dateTime(o.createdAt) },
  ];

  return (
    <Box>
      <PageHeader title={title} subtitle="Store performance at a glance" actions={
        <ToggleButtonGroup exclusive size="small" value={range} onChange={(_, v) => v && setRange(v)} aria-label="Date range" sx={{ flexWrap: 'wrap', bgcolor: '#fff' }}>
          {RANGES.map(([v, l]) => <ToggleButton key={v} value={v} sx={{ textTransform: 'none', px: 1.5 }}>{l}</ToggleButton>)}
        </ToggleButtonGroup>
      } />
      {range === 'custom' && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <TextField type="date" label="From" size="small" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ maxWidth: 200 }} />
          <TextField type="date" label="To" size="small" value={to} onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ maxWidth: 200 }} />
        </Box>
      )}
      {error && !data ? <ErrorNote error={error} onRetry={() => refetch()} /> : isLoading || !data ? (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' } }}>{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} variant="rounded" height={92} />)}</Box>
      ) : (
        <>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2,minmax(0,1fr))', lg: 'repeat(4,minmax(0,1fr))' } }}>
            <Kpi label="Total sales" value={money(data.totals.salesPaise)} hint="All time (paid orders)" />
            <Kpi label="Today's sales" value={money(data.totals.todayPaise)} tone="sky" />
            <Kpi label="Monthly revenue" value={money(data.totals.monthPaise)} tone="green" />
            <Kpi highlight label="Period revenue" value={money(data.totals.periodPaise)} hint={`${data.orders.period} orders · avg ${money(data.orders.avgOrderPaise)}`} />
            <Kpi label="Total orders" value={String(data.orders.total)} />
            <Kpi label="Pending orders" value={String(data.orders.pending)} tone="warn" />
            <Kpi label="Customers" value={String(data.customers)} tone="sky" />
            <Kpi label="Products" value={String(data.products)} tone="green" />
            <Kpi label="Low stock" value={String(data.lowStock)} tone="warn" hint="Variants at or below threshold" />
            <Kpi label="Out of stock" value={String(data.outOfStock)} tone="warn" />
          </Box>

          <Box sx={{ display: 'grid', gap: 2.5, mt: 3, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' } }}>
            <Panel title="Revenue trend">{data.series.length ? <RevenueChart data={data.series} /> : <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>No paid orders in this period.</Typography>}</Panel>
            <Panel title="Order status">{data.statuses.length ? <><StatusPie data={data.statuses} /><Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center' }}>{data.statuses.map((s) => <Chip key={s.status} size="small" label={`${s.status.replace(/_/g, ' ')}: ${s.count}`} />)}</Box></> : <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>No orders yet.</Typography>}</Panel>
          </Box>
          <Box sx={{ display: 'grid', gap: 2.5, mt: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
            <Panel title="Orders per day">{data.series.length ? <OrdersBar data={data.series} /> : <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>No data.</Typography>}</Panel>
            <Panel title="Best-selling products">
              {data.topProducts.length === 0 ? <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No sales in this period.</Typography> : data.topProducts.map((p, i) => (
                <Box key={p.productId} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 1.25, borderTop: i ? `1px solid ${brand.line}` : 0 }}>
                  <Typography sx={{ fontWeight: 600 }}>{i + 1}. {p.name}</Typography>
                  <Typography color="text.secondary" variant="body2">{p.quantity} sold · {money(p.revenuePaise)}</Typography>
                </Box>
              ))}
            </Panel>
          </Box>
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>Recent orders</Typography>
            <DataTable columns={orderCols} rows={data.recentOrders} getId={(o) => o.id} onRowClick={(o) => router.push(`/admin/orders/${o.id}`)} empty="No orders yet." />
          </Box>
        </>
      )}
    </Box>
  );
}
