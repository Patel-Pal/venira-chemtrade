import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import { getAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: { default: 'Admin', template: '%s | Admin' }, robots: { index: false, follow: false } };

/** Server-side gate: re-validates the session (revocation, blocked user) on every admin request. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth();
  if (!auth) redirect('/login?next=/admin');
  if (!auth.isStaff) redirect('/');
  return <AdminShell variant="admin" permissions={[...auth.permissions]} isSuperAdmin={auth.isSuperAdmin}>{children}</AdminShell>;
}
