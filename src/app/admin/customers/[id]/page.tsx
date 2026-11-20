import { CustomerDetail } from '@/components/admin/MiscAdmin';
import { AccessDenied } from '@/components/admin/ui';
import { guard } from '@/lib/page-guard';

export const metadata = { title: 'Customer' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!(await guard('customers.read'))) return <AccessDenied what="customers" />;
  const { id } = await params;
  return <CustomerDetail id={id} />;
}
