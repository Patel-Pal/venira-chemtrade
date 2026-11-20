import { ReviewsAdmin } from '@/components/admin/MiscAdmin';
import { AccessDenied } from '@/components/admin/ui';
import { guard } from '@/lib/page-guard';

export const metadata = { title: 'Reviews' };

export default async function Page() {
  if (!(await guard('reviews.moderate'))) return <AccessDenied what="reviews" />;
  return <ReviewsAdmin />;
}
