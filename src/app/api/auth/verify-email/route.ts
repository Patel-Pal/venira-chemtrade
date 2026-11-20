import { route, parseBody } from '@/lib/api';
import { verifyEmailSchema, emailSchema } from '@/schemas';
import { resendVerification, verifyEmail } from '@/modules/auth/auth.service';
import { z } from 'zod';

export const POST = route({ limit: { bucket: 'verify', max: 20, windowMs: 60 * 60_000 } }, async ({ req }) => {
  const { token } = await parseBody(req, verifyEmailSchema);
  await verifyEmail(token);
  return { message: 'Email verified. You can sign in now.' };
});

/** PUT = resend the verification email (always responds the same). */
export const PUT = route({ limit: { bucket: 'verify-resend', max: 5, windowMs: 60 * 60_000 } }, async ({ req }) => {
  const { email } = await parseBody(req, z.object({ email: emailSchema }));
  await resendVerification(email);
  return { message: 'If the account needs verification, a new link has been sent.' };
});
