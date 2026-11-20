import type { Metadata } from 'next';
import AccountShell from '@/components/account/AccountShell';
import { AddressesPanel } from '@/components/account/AccountPanels';

export const metadata: Metadata = { title: 'Saved addresses', robots: { index: false } };

export default function Page() {
  return (
    <AccountShell title="Saved addresses">
      <AddressesPanel />
    </AccountShell>
  );
}
