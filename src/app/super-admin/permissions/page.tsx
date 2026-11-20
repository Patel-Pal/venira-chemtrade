import { PermissionsMatrix } from '@/components/admin/SuperAdminViews';
import { AccessDenied } from '@/components/admin/ui';
import { guard } from '@/lib/page-guard';

export const metadata = { title: 'Permissions' };

export default async function Page() {
  if (!(await guard('roles.manage'))) return <AccessDenied what="this section" />;
  return <PermissionsMatrix />;
}
