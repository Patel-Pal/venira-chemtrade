import { redirect } from 'next/navigation';
import { getAuth, hasPermission, type AuthContext } from './auth';
import type { Permission } from '@/constants/permissions';

/**
 * Server-component guard. Returns the auth context if the user is staff AND holds the permission,
 * `null` if signed in but lacking permission (render <AccessDenied/>), and redirects when signed out.
 * The API routes enforce the same permissions independently.
 */
export async function guard(perm?: Permission | Permission[], opts: { superAdminOnly?: boolean } = {}): Promise<AuthContext | null> {
  const auth = await getAuth();
  if (!auth) redirect('/login?next=/admin');
  if (!auth.isStaff) redirect('/');
  if (opts.superAdminOnly && !auth.isSuperAdmin) return null;
  if (perm) {
    const list = Array.isArray(perm) ? perm : [perm];
    if (!list.every((p) => hasPermission(auth, p))) return null;
  }
  return auth;
}
