import { route, parseBody } from '@/lib/api';
import { forgotSchema } from '@/schemas';
import { requestPasswordReset } from '@/modules/auth/auth.service';

export const POST = route({ limit: { bucket: 'forgot', max: 5, windowMs: 60 * 60_000 } }, async ({ req }) => {
  const { email } = await parseBody(req, forgotSchema);
  await requestPasswordReset(email);
  return { message: 'If an account exists for this email, a reset link has been sent.' };
});
