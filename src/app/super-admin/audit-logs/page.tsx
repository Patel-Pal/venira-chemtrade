import { AuditLogs } from '@/components/admin/SuperAdminViews';
import { AccessDenied } from '@/components/admin/ui';
import { guard } from '@/lib/page-guard';

export const metadata = { title: 'Audit logs' };

export default async function Page() {
  if (!(await guard('audit.read'))) return <AccessDenied what="this section" />;
  return <AuditLogs />;
}
