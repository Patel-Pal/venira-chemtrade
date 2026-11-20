import ProductForm from '@/components/admin/ProductForm';
import { AccessDenied } from '@/components/admin/ui';
import { guard } from '@/lib/page-guard';

export const metadata = { title: 'Edit product' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  if (!(await guard('products.read'))) return <AccessDenied what="products" />;
  const { id } = await params;
  return <ProductForm productId={id} />;
}
