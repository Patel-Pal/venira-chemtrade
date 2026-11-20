import { CustomersAdmin } from '@/components/admin/MiscAdmin';
import { AccessDenied } from '@/components/admin/ui';
import { guard } from '@/lib/page-guard';

export const metadata = { title: 'Customers' };

export default async function Page() {
  if (!(await guard('customers.read'))) return <AccessDenied what="customers" />;
  return <CustomersAdmin />;
}
