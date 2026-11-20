import type { Metadata } from 'next';
import AccountShell from '@/components/account/AccountShell';
import { OrdersPanel } from '@/components/account/AccountPanels';

export const metadata: Metadata = { title: 'My orders', robots: { index: false } };

export default function Page() {
  return (
    <AccountShell title="My orders">
      <OrdersPanel />
    </AccountShell>
  );
}
