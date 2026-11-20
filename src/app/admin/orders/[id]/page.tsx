import { OrderDetailAdmin } from '@/components/admin/OrdersAdmin';
import { AccessDenied } from '@/components/admin/ui';
import { guard } from '@/lib/page-guard';

export const metadata = { title: 'Order' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!(await guard('orders.read'))) return <AccessDenied what="orders" />;
  const { id } = await params;
  return <OrderDetailAdmin id={id} />;
}
