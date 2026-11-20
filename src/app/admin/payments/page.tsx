import { PaymentsAdmin } from '@/components/admin/MiscAdmin';
import { AccessDenied } from '@/components/admin/ui';
import { guard } from '@/lib/page-guard';

export const metadata = { title: 'Payments' };

export default async function Page() {
  if (!(await guard('payments.read'))) return <AccessDenied what="payments" />;
  return <PaymentsAdmin />;
}
