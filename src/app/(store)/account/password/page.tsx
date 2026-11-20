import type { Metadata } from 'next';
import AccountShell from '@/components/account/AccountShell';
import { PasswordPanel } from '@/components/account/AccountPanels';

export const metadata: Metadata = { title: 'Change password', robots: { index: false } };

export default function Page() {
  return (
    <AccountShell title="Change password">
      <PasswordPanel />
    </AccountShell>
  );
}
