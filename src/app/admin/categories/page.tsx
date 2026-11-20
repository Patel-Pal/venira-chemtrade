import { CategoriesAdmin } from '@/components/admin/ResourceAdmins';
import { AccessDenied } from '@/components/admin/ui';
import { guard } from '@/lib/page-guard';

export const metadata = { title: 'Categories' };

export default async function Page() {
  if (!(await guard('categories.read'))) return <AccessDenied what="categories" />;
  return <CategoriesAdmin />;
}
