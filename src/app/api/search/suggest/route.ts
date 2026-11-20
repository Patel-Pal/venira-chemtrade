import { z } from 'zod';
import { route, parseQuery } from '@/lib/api';
import { suggest } from '@/modules/products/catalog.service';

export const GET = route({ access: 'none', limit: { bucket: 'suggest', max: 120, windowMs: 60_000 } }, async ({ req }) => {
  const { q } = parseQuery(req, z.object({ q: z.string().trim().max(60).default('') }));
  return suggest(q);
});
