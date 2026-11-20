import { AdminsManager } from '@/components/admin/SuperAdminViews';
import { AccessDenied } from '@/components/admin/ui';
import { guard } from '@/lib/page-guard';

export const metadata = { title: 'Admins' };

export default async function Page() {
  if (!(await guard('admins.manage'))) return <AccessDenied what="this section" />;
  return <AdminsManager />;
}
