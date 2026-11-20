import { route, parseBody } from '@/lib/api';
import { getRepos } from '@/database/repositories';
import { newsletterSchema } from '@/schemas';

export const POST = route({ limit: { bucket: 'newsletter', max: 5, windowMs: 60 * 60_000 } }, async ({ req }) => {
  const { email } = await parseBody(req, newsletterSchema);
  const repos = await getRepos();
  await repos.userData.subscribe(email);
  return { message: 'You are subscribed. Thank you!' };
});
