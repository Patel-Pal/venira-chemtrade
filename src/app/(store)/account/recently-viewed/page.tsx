import type { Metadata } from 'next';
import AccountShell from '@/components/account/AccountShell';
import { RecentlyViewedPanel } from '@/components/account/AccountPanels';

export const metadata: Metadata = { title: 'Recently viewed', robots: { index: false } };

export default function Page() {
  return (
    <AccountShell title="Recently viewed">
      <RecentlyViewedPanel />
    </AccountShell>
  );
}
