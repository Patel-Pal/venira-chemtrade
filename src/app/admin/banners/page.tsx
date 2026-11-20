import { BannersAdmin } from '@/components/admin/ResourceAdmins';
import { AccessDenied, PageHeader } from '@/components/admin/ui';
import { guard } from '@/lib/page-guard';

export const metadata = { title: 'Banners & content' };

export default async function Page() {
  const auth = await guard('content.manage');
  if (!auth) return <AccessDenied what="content management" />;
  return (
    <>
      <PageHeader title="Banners & content" subtitle="Homepage banners, pages, policies and FAQ." />
      <BannersAdmin canBanners canPages />
    </>
  );
}
