import { cached } from '@/lib/cache';
import { DEFAULT_SETTINGS, getStoreSettings, type StoreSettings } from './settings.service';

/** Cross-request cached settings for storefront rendering; DB failures fall back to defaults so pages still render. */
export const getPublicSettings = cached(
  async (): Promise<StoreSettings> => {
    try {
      return await getStoreSettings();
    } catch {
      return DEFAULT_SETTINGS;
    }
  },
  ['public-settings'],
  60,
);
