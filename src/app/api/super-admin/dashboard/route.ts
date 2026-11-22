import { route } from '@/lib/api';
import { platformDashboard } from '@/modules/analytics/analytics.service';
import { cached } from '@/lib/cache';

const platformCached = cached(async () => platformDashboard(), ['sa:dashboard'], 30);

export const GET = route({ access: 'staff', permission: 'system.manage' }, async () => platformCached());
