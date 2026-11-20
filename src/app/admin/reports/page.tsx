import { ReportsAdmin } from '@/components/admin/MiscAdmin';
import { AccessDenied } from '@/components/admin/ui';
import { guard } from '@/lib/page-guard';

export const metadata = { title: 'Reports' };

export default async function Page() {
  if (!(await guard('reports.read'))) return <AccessDenied what="reports" />;
  return <ReportsAdmin />;
}
