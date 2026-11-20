import { route, parseBody } from '@/lib/api';
import { createSession } from '@/lib/auth';
import { rateLimit } from '@/lib/security';
import { loginSchema } from '@/schemas';
import { authenticate } from '@/modules/auth/auth.service';

export const POST = route({ limit: { bucket: 'login-ip', max: 20, windowMs: 15 * 60_000 } }, async ({ req, ip }) => {
  const { email, password } = await parseBody(req, loginSchema);
  rateLimit(`login-email:${email}`, 8, 15 * 60_000); // per-account throttle on top of per-IP
  const user = await authenticate(email, password, ip);
  await createSession(user, { ip, userAgent: req.headers.get('user-agent') ?? undefined });
  return { user: { id: user.id, name: user.name, email: user.email, roleKey: user.roleKey, emailVerified: user.emailVerified } };
});
