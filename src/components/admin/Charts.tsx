'use client';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { brand } from '@/theme/tokens';

const fmtINR = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v / 100);
const PALETTE = [brand.navy, brand.sky, brand.green, '#F5A524', '#9B59B6', '#E5484D', '#6B7A90', '#2E7D32', '#00A3A3', '#B7791F', '#7C3AED'];

export function RevenueChart({ data }: { data: { date: string; revenuePaise: number; orders: number }[] }) {
  return (
    <div role="img" aria-label="Revenue trend chart" style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={brand.sky} stopOpacity={0.5} /><stop offset="95%" stopColor={brand.sky} stopOpacity={0} /></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={brand.line} vertical={false} />
          <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v: number) => `₹${Math.round(v / 100 / 1000)}k`} tick={{ fontSize: 12 }} width={48} />
          <Tooltip formatter={(v) => fmtINR(Number(v))} labelFormatter={(l) => String(l)} />
          <Area type="monotone" dataKey="revenuePaise" name="Revenue" stroke={brand.navy} strokeWidth={2.5} fill="url(#rev)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OrdersBar({ data }: { data: { date: string; orders: number }[] }) {
  return (
    <div role="img" aria-label="Orders per day chart" style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={brand.line} vertical={false} />
          <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
          <Tooltip />
          <Bar dataKey="orders" name="Orders" fill={brand.green} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusPie({ data }: { data: { status: string; count: number }[] }) {
  return (
    <div role="img" aria-label="Order status breakdown chart" style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="status" innerRadius={55} outerRadius={90} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Pie>
          <Tooltip formatter={(v, n) => [v, String(n).replace(/_/g, ' ')]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export const STATUS_COLORS = PALETTE;
