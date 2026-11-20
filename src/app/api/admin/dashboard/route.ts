import { route, parseQuery } from '@/lib/api';
import { dateRangeSchema } from '@/schemas';
import { adminDashboard } from '@/modules/analytics/analytics.service';

export const GET = route({ access: 'staff', permission: 'reports.read' }, async ({ req }) => {
  const q = parseQuery(req, dateRangeSchema);
  return adminDashboard(q.range, q.from, q.to);
});
