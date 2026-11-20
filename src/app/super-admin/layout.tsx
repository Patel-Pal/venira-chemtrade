import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import { getAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: { default: 'Super Admin', template: '%s | Super Admin' }, robots: { index: false, follow: false } };

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth();
  if (!auth) redirect('/login?next=/super-admin');
  if (!auth.isSuperAdmin) redirect(auth.isStaff ? '/admin' : '/');
  return <AdminShell variant="super" permissions={[...auth.permissions]} isSuperAdmin>{children}</AdminShell>;
}
