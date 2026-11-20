import ProductForm from '@/components/admin/ProductForm';
import { AccessDenied } from '@/components/admin/ui';
import { guard } from '@/lib/page-guard';

export const metadata = { title: 'New product' };

export default async function Page() {
  if (!(await guard('products.create'))) return <AccessDenied what="product creation" />;
  return <ProductForm />;
}
