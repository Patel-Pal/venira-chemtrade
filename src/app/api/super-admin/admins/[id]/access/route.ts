import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { resetStaffAccess, revokeSessions } from '@/modules/users/admin-users.service';

/** action=reset: revoke sessions + email a password-reset link. action=revoke: revoke sessions only. */
export const POST = route<{ id: string }>({ access: 'staff', permission: 'admins.manage' }, async ({ req, params, auth, ip }) => {
  const { action } = await parseBody(req, z.object({ action: z.enum(['reset', 'revoke']) }));
  return action === 'reset' ? resetStaffAccess(auth!, params.id, ip) : revokeSessions(auth!, params.id, ip);
});
