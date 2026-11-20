import { cache } from 'react';
import { getRepos } from '@/database/repositories';
import { isCloudinaryConfigured, isRazorpayConfigured } from '@/config/env';
import { audit } from '../audit/audit.service';

export interface StoreSettings {
  storeName: string;
  tagline?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  whatsapp?: string;
  currency: 'INR';
  social: { instagram?: string; facebook?: string; linkedin?: string; youtube?: string };
  seo: { title?: string; description?: string };
  announcement?: string;
  maintenanceMode: boolean;
  notifications: { orderEmails: boolean; lowStockAlerts: boolean };
  featureFlags: Record<string, boolean>;
  brandStory?: string;
  hero: { eyebrow?: string; heading?: string; subheading?: string; ctaLabel?: string; ctaUrl?: string };
}

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'Venira Chemtrade',
  tagline: 'Trusted Chemical Trading Partner',
  currency: 'INR',
  social: {},
  seo: {},
  maintenanceMode: false,
  notifications: { orderEmails: true, lowStockAlerts: true },
  featureFlags: { reviews: true, wishlist: true, newsletter: true, guestCart: true },
  hero: {},
};

export const getStoreSettings = cache(async (): Promise<StoreSettings> => {
  const repos = await getRepos();
  const stored = await repos.settings.get<Partial<StoreSettings>>('store');
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}), social: { ...(stored?.social ?? {}) }, notifications: { ...DEFAULT_SETTINGS.notifications, ...(stored?.notifications ?? {}) }, featureFlags: { ...DEFAULT_SETTINGS.featureFlags, ...(stored?.featureFlags ?? {}) }, hero: { ...(stored?.hero ?? {}) } };
});

export async function updateStoreSettings(patch: Partial<StoreSettings>, actor: { userId: string; ip?: string }) {
  const repos = await getRepos();
  const before = await getStoreSettings();
  const next = { ...before, ...patch, social: { ...before.social, ...(patch.social ?? {}) }, seo: { ...before.seo, ...(patch.seo ?? {}) }, hero: { ...before.hero, ...(patch.hero ?? {}) }, notifications: { ...before.notifications, ...(patch.notifications ?? {}) }, featureFlags: { ...before.featureFlags, ...(patch.featureFlags ?? {}) } };
  await repos.settings.set('store', next);
  await audit({ userId: actor.userId, ip: actor.ip, action: 'settings.update', resourceType: 'settings', resourceId: 'store', before, after: next });
  return next;
}

/** Only booleans about configuration - secret values are never returned to the browser. */
export function integrationStatus() {
  return { razorpay: isRazorpayConfigured(), cloudinary: isCloudinaryConfigured() };
}
