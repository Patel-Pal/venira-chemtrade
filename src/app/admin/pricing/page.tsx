import { Suspense } from 'react';
import PricingAdmin from '@/components/admin/PricingAdmin';
import { AccessDenied } from '@/components/admin/ui';
import { guard } from '@/lib/page-guard';

export const metadata = { title: 'Pricing' };

export default async function Page() {
  if (!(await guard('products.read'))) return <AccessDenied what="pricing" />;
  return <Suspense><PricingAdmin /></Suspense>;
}
