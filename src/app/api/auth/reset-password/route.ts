import { route, parseBody } from '@/lib/api';
import { resetSchema } from '@/schemas';
import { resetPassword } from '@/modules/auth/auth.service';

export const POST = route({ limit: { bucket: 'reset', max: 10, windowMs: 60 * 60_000 } }, async ({ req }) => {
  const { token, password } = await parseBody(req, resetSchema);
  await resetPassword(token, password);
  return { message: 'Password updated. Please sign in.' };
});
