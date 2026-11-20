import { route } from '@/lib/api';
import { destroyCurrentSession } from '@/lib/auth';

export const POST = route({ access: 'none' }, async () => {
  await destroyCurrentSession();
  return { loggedOut: true };
});
