'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CancelIcon from '@mui/icons-material/Cancel';
import { brand } from '@/theme/tokens';
import type { OrderStatus } from '@/types/domain';

const FLOW: OrderStatus[] = ['confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
const LABEL: Record<string, string> = {
  pending: 'Order placed', payment_pending: 'Awaiting payment', confirmed: 'Confirmed', processing: 'Processing', packed: 'Packed', shipped: 'Shipped',
  out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled', returned: 'Returned', refunded: 'Refunded',
};

export default function OrderTimeline({ status, history }: { status: OrderStatus; history: { status: OrderStatus; at: string; note?: string }[] }) {
  const reached = new Map<string, { at: string; note?: string }>();
  history.forEach((h) => reached.set(h.status, { at: h.at, note: h.note }));
  const terminalProblem = ['cancelled', 'returned', 'refunded'].includes(status);
  // Happy-path steps (future ones greyed) unless the order ended in cancel/return/refund: then show only what really happened.
  const steps: OrderStatus[] = terminalProblem
    ? Array.from(new Set(history.map((h) => h.status)))
    : status === 'payment_pending' || status === 'pending' ? ['payment_pending', ...FLOW] : FLOW;
  const currentIdx = steps.indexOf(status);

  return (
    <Box component="ol" aria-label="Order progress" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 0 }}>
      {steps.map((s, i) => {
        const info = reached.get(s);
        const done = Boolean(info) && (terminalProblem || i <= currentIdx);
        const bad = s === 'cancelled' || s === 'returned';
        return (
          <Box component="li" key={s} aria-current={i === currentIdx ? 'step' : undefined} sx={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 1.5, position: 'relative', pb: i === steps.length - 1 ? 0 : 2.5 }}>
            {i < steps.length - 1 && <Box aria-hidden sx={{ position: 'absolute', left: 13, top: 26, bottom: 0, width: 3, borderRadius: 2, background: done && !terminalProblem && i < currentIdx ? `linear-gradient(180deg, ${brand.green}, ${brand.sky})` : brand.line }} />}
            <Box sx={{ color: bad ? 'error.main' : done ? (i === currentIdx ? brand.navy : brand.greenDark) : '#B8C4D6', display: 'grid', placeItems: 'start center', ...(i === currentIdx && !bad ? { '& svg': { filter: `drop-shadow(0 0 6px ${brand.sky})` } } : {}) }}>
              {bad ? <CancelIcon /> : done ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
            </Box>
            <Box>
              <Typography sx={{ fontWeight: i === currentIdx ? 800 : done ? 600 : 500, color: done ? 'text.primary' : 'text.secondary' }}>{LABEL[s] ?? s}</Typography>
              {info && <Typography variant="caption" color="text.secondary">{new Date(info.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}{info.note ? ` · ${info.note}` : ''}</Typography>}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
