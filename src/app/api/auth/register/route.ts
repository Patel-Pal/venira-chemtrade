import { route, parseBody } from '@/lib/api';
import { registerSchema } from '@/schemas';
import { registerCustomer } from '@/modules/auth/auth.service';

export const POST = route({ limit: { bucket: 'register', max: 10, windowMs: 60 * 60_000 } }, async ({ req, ip }) => {
  const body = await parseBody(req, registerSchema);
  const r = await registerCustomer(body, ip);
  // Same response whether or not the email was already registered.
  return { message: r.autoVerified ? 'Account created. You can sign in now.' : 'If this email is new, a verification link is on its way.', autoVerified: r.autoVerified };
});
