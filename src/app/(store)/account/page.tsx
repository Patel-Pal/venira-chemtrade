import type { Metadata } from 'next';
import AccountShell from '@/components/account/AccountShell';
import { ProfilePanel } from '@/components/account/AccountPanels';

export const metadata: Metadata = { title: 'Profile', robots: { index: false } };

export default function Page() {
  return (
    <AccountShell title="Profile">
      <ProfilePanel />
    </AccountShell>
  );
}
