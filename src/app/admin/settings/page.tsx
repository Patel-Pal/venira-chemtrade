import { SettingsAdmin } from '@/components/admin/MiscAdmin';
import { AccessDenied } from '@/components/admin/ui';
import { guard } from '@/lib/page-guard';

export const metadata = { title: 'Settings' };

export default async function Page() {
  if (!(await guard('settings.manage'))) return <AccessDenied what="settings" />;
  return <SettingsAdmin canShipping />;
}
