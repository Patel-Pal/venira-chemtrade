import { Suspense } from 'react';
import ProductsAdmin from '@/components/admin/ProductsAdmin';
import { AccessDenied } from '@/components/admin/ui';
import { guard } from '@/lib/page-guard';

export const metadata = { title: 'Products' };

export default async function Page() {
  if (!(await guard('products.read'))) return <AccessDenied what="products" />;
  return <Suspense><ProductsAdmin /></Suspense>;
}
