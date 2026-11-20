import { cache } from 'react';
import { cookies } from 'next/headers';
import { getEnv } from '@/config/env';
import { getRepos } from '@/database/repositories';
import { Errors } from './errors';
import { randomToken, sha256 } from './security';
import { SESSION_COOKIE, sessionCookieOptions, signSession, verifySession } from './session-token';
import { ALL_PERMISSIONS, STAFF_ROLE_KEYS, type Permission } from '@/constants/permissions';
import type { PublicUser } from '@/types/domain';

export interface AuthContext {
  user: PublicUser;
  sessionId: string;
  permissions: Set<string>;
  isSuperAdmin: boolean;
  isStaff: boolean;
}

export function hasPermission(ctx: AuthContext, perm: Permission | string): boolean {
  return ctx.isSuperAdmin || ctx.permissions.has(perm);
}

/** Throws 403 unless the user holds ALL (or ANY, when `any` is true) of the permissions. */
export function requirePermission(ctx: AuthContext, perms: Permission | Permission[], any = false): void {
  const list = Array.isArray(perms) ? perms : [perms];
  const ok = any ? list.some((p) => hasPermission(ctx, p)) : list.every((p) => hasPermission(ctx, p));
  if (!ok) throw Errors.forbidden();
}

/** Starts a session and sets the HttpOnly cookie. */
export async function createSession(user: PublicUser, meta: { ip?: string; userAgent?: string }) {
  const env = getEnv();
  const repos = await getRepos();
  const jti = randomToken(32);
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  await repos.sessions.create({ userId: user.id, tokenHash: sha256(jti), ip: meta.ip, userAgent: meta.userAgent?.slice(0, 250), expiresAt });
  const token = await signSession({ jti, uid: user.id, role: user.roleKey }, env.AUTH_SECRET);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(env.NODE_ENV === 'production'));
}

export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const claims = await verifySession(token, getEnv().AUTH_SECRET);
  if (claims) {
    const repos = await getRepos();
    const s = await repos.sessions.findActiveByTokenHash(sha256(claims.jti));
    if (s) await repos.sessions.revoke(s.id);
  }
  store.set(SESSION_COOKIE, '', { ...sessionCookieOptions(false), maxAge: 0 });
}

async function resolve(): Promise<AuthContext | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const claims = await verifySession(token, getEnv().AUTH_SECRET);
  if (!claims) return null;
  const repos = await getRepos();
  const session = await repos.sessions.findActiveByTokenHash(sha256(claims.jti));
  if (!session || session.userId !== claims.uid) return null; // revoked / expired
  const user = await repos.users.findById(claims.uid);
  if (!user || user.status === 'blocked' || user.status === 'deactivated') return null;
  const { passwordHash: _ph, ...publicUser } = user;
  const role = await repos.roles.findById(user.roleId);
  const permissions = new Set<string>([...(role?.permissions ?? []), ...user.extraPermissions]);
  const isSuperAdmin = user.roleKey === 'super_admin';
  if (isSuperAdmin) ALL_PERMISSIONS.forEach((p) => permissions.add(p));
  return { user: publicUser, sessionId: session.id, permissions, isSuperAdmin, isStaff: STAFF_ROLE_KEYS.includes(user.roleKey) };
}

/** Per-request memoized auth lookup (safe to call from layouts, pages and route handlers). */
export const getAuth = cache(resolve);

export async function requireAuth(): Promise<AuthContext> {
  const a = await getAuth();
  if (!a) throw Errors.unauthorized();
  return a;
}
