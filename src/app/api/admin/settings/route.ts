import { route, parseBody } from '@/lib/api';
import { settingsSchema } from '@/schemas';
import { getStoreSettings, integrationStatus, updateStoreSettings } from '@/modules/settings/settings.service';
import { revalidateCatalog } from '@/lib/cache';

export const GET = route({ access: 'staff', permission: 'settings.manage' }, async () => {
  return { settings: await getStoreSettings(), integrations: integrationStatus() }; // booleans only, never secrets
});

export const PUT = route({ access: 'staff', permission: 'settings.manage' }, async ({ req, auth, ip }) => {
  const body = await parseBody(req, settingsSchema);
  const next = await updateStoreSettings(body as never, { userId: auth!.user.id, ip });
  revalidateCatalog();
  return { settings: next };
});
