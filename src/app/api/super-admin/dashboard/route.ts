import { route } from '@/lib/api';
import { platformDashboard } from '@/modules/analytics/analytics.service';

export const GET = route({ access: 'staff', permission: 'system.manage' }, async () => platformDashboard());
