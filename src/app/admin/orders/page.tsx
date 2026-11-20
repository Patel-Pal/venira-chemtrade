import { Suspense } from 'react';
import { OrdersList } from '@/components/admin/OrdersAdmin';
import { AccessDenied } from '@/components/admin/ui';
import { guard } from '@/lib/page-guard';

export const metadata = { title: 'Orders' };

export default async function Page() {
  if (!(await guard('orders.read'))) return <AccessDenied what="orders" />;
  return <Suspense><OrdersList /></Suspense>;
}
