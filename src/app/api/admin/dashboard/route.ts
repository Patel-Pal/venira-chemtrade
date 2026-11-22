import { route, parseQuery } from '@/lib/api';
import { dateRangeSchema } from '@/schemas';
import { adminDashboard, type RangeKey } from '@/modules/analytics/analytics.service';
import { cached } from '@/lib/cache';

// Preset ranges are cached for 30s (the permission check in route() runs BEFORE this, so access control is unchanged).
// Custom ranges are user-defined and unbounded, so they are never cached.
const presetDashboard = cached(async (range: RangeKey) => adminDashboard(range), ['admin:dashboard'], 30);

export const GET = route({ access: 'staff', permission: 'reports.read' }, async ({ req }) => {
  const q = parseQuery(req, dateRangeSchema);
  return q.range === 'custom' ? adminDashboard(q.range, q.from, q.to) : presetDashboard(q.range);
});
