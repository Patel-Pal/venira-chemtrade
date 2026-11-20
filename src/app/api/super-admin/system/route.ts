import { route, parseBody } from '@/lib/api';
import { z } from 'zod';
import { getStoreSettings, integrationStatus, updateStoreSettings } from '@/modules/settings/settings.service';
import { getEnv } from '@/config/env';

/** Platform configuration: feature flags, maintenance mode and integration health (configured? yes/no only). */
export const GET = route({ access: 'staff', permission: 'system.manage' }, async () => {
  const s = await getStoreSettings();
  const env = getEnv();
  return {
    featureFlags: s.featureFlags, maintenanceMode: s.maintenanceMode, integrations: { ...integrationStatus(), email: Boolean(env.EMAIL_PROVIDER_API_KEY), webhookSecret: Boolean(env.RAZORPAY_WEBHOOK_SECRET), cron: Boolean(env.CRON_SECRET) },
    runtime: { nodeEnv: env.NODE_ENV, appUrl: env.NEXT_PUBLIC_APP_URL, reservationMinutes: env.CHECKOUT_RESERVATION_MINUTES },
  };
});

export const PUT = route({ access: 'staff', permission: 'system.manage' }, async ({ req, auth, ip }) => {
  const b = await parseBody(req, z.object({ featureFlags: z.record(z.string().max(40), z.boolean()).optional(), maintenanceMode: z.boolean().optional() }));
  const next = await updateStoreSettings(b as never, { userId: auth!.user.id, ip });
  return { featureFlags: next.featureFlags, maintenanceMode: next.maintenanceMode };
});
