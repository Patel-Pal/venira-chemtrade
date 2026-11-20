import type { Metadata } from 'next';
import AccountShell from '@/components/account/AccountShell';
import { MyReviewsPanel } from '@/components/account/AccountPanels';

export const metadata: Metadata = { title: 'My reviews', robots: { index: false } };

export default function Page() {
  return (
    <AccountShell title="My reviews">
      <MyReviewsPanel />
    </AccountShell>
  );
}
