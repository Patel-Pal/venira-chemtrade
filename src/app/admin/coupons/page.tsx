import { CouponsAdmin } from '@/components/admin/ResourceAdmins';
import { AccessDenied } from '@/components/admin/ui';
import { guard } from '@/lib/page-guard';

export const metadata = { title: 'Coupons' };

export default async function Page() {
  if (!(await guard('coupons.manage'))) return <AccessDenied what="coupons" />;
  return <CouponsAdmin />;
}
