import { InventoryAdmin } from '@/components/admin/MiscAdmin';
import { AccessDenied } from '@/components/admin/ui';
import { guard } from '@/lib/page-guard';

export const metadata = { title: 'Inventory' };

export default async function Page() {
  if (!(await guard('inventory.read'))) return <AccessDenied what="inventory" />;
  return <InventoryAdmin />;
}
