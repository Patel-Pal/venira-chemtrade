import { route } from '@/lib/api';
import { getRepos } from '@/database/repositories';
import { Errors } from '@/lib/errors';

export const GET = route<{ slug: string }>({ access: 'none' }, async ({ params }) => {
  const repos = await getRepos();
  const r = await repos.pages.list({ page: 1, limit: 1, filter: { slug: params.slug, isPublished: true } });
  if (!r.items[0]) throw Errors.notFound('Page not found');
  const { id: _id, ...page } = r.items[0];
  return page;
});
