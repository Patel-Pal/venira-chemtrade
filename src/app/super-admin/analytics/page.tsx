import { AnalyticsView } from '@/components/admin/SuperAdminViews';
import { AccessDenied } from '@/components/admin/ui';
import { guard } from '@/lib/page-guard';

export const metadata = { title: 'Analytics' };

export default async function Page() {
  if (!(await guard('system.manage'))) return <AccessDenied what="this section" />;
  return <AnalyticsView />;
}
