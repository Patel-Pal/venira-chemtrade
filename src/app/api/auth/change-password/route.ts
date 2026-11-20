import { route, parseBody } from '@/lib/api';
import { createSession } from '@/lib/auth';
import { changePasswordSchema } from '@/schemas';
import { changePassword } from '@/modules/auth/auth.service';

export const POST = route({ access: 'user', limit: { bucket: 'chpw', max: 10, windowMs: 60 * 60_000 } }, async ({ req, auth, ip }) => {
  const { currentPassword, newPassword } = await parseBody(req, changePasswordSchema);
  await changePassword(auth!.user.id, currentPassword, newPassword); // revokes all sessions
  await createSession(auth!.user, { ip, userAgent: req.headers.get('user-agent') ?? undefined }); // keep this device signed in
  return { message: 'Password changed. Other devices have been signed out.' };
});
