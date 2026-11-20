import { route } from '@/lib/api';

/** Current session summary for the client auth store. Returns user=null (200) when signed out. */
export const GET = route({ access: 'optional' }, async ({ auth }) => {
  if (!auth) return { user: null };
  const u = auth.user;
  return {
    user: { id: u.id, name: u.name, email: u.email, phone: u.phone, roleKey: u.roleKey, emailVerified: u.emailVerified },
    permissions: auth.isStaff ? [...auth.permissions] : [],
    isStaff: auth.isStaff,
    isSuperAdmin: auth.isSuperAdmin,
  };
});
