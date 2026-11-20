import { RolesManager } from '@/components/admin/SuperAdminViews';
import { AccessDenied } from '@/components/admin/ui';
import { guard } from '@/lib/page-guard';

export const metadata = { title: 'Roles' };

export default async function Page() {
  if (!(await guard('roles.manage'))) return <AccessDenied what="this section" />;
  return <RolesManager />;
}
