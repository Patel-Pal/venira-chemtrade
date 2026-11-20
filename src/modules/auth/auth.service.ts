import { getEnv } from '@/config/env';
import { getRepos } from '@/database/repositories';
import { Errors } from '@/lib/errors';
import { getDummyHash, hashPassword, randomToken, sha256, verifyPassword } from '@/lib/security';
import { sendEmail, templates } from '@/services/email';
import { audit } from '../audit/audit.service';
import type { PublicUser, User } from '@/types/domain';

const LOCK_AFTER = 5;
const LOCK_MS = 15 * 60 * 1000;

function strip(user: User): PublicUser {
  const { passwordHash: _p, ...rest } = user;
  return rest;
}

export async function registerCustomer(input: { name: string; email: string; phone?: string; password: string }, ip?: string) {
  const repos = await getRepos();
  const env = getEnv();
  const existing = await repos.users.findByEmail(input.email);
  // Do not reveal whether an email is registered (user enumeration).
  if (existing) return { autoVerified: false };

  const role = await repos.roles.findByKey('customer');
  if (!role) throw Errors.unprocessable('Store is not initialised. Run the database seed.');
  // Dev convenience only: with no email provider configured outside production, verify immediately.
  const autoVerify = env.NODE_ENV !== 'production' && !env.EMAIL_PROVIDER_API_KEY;
  const user = await repos.users.create({
    email: input.email, name: input.name, phone: input.phone, passwordHash: await hashPassword(input.password),
    roleId: role.id, roleKey: role.key, extraPermissions: [], status: autoVerify ? 'active' : 'pending',
    emailVerified: autoVerify, authProviders: [],
  });
  if (!autoVerify) await sendVerification(user);
  await audit({ userId: user.id, ip, action: 'auth.register', resourceType: 'user', resourceId: user.id });
  return { autoVerified: autoVerify };
}

async function sendVerification(user: Pick<User, 'id' | 'email' | 'name'>) {
  const repos = await getRepos();
  const token = randomToken(32);
  await repos.users.setEmailVerifyToken(user.id, sha256(token), new Date(Date.now() + 24 * 3600 * 1000));
  const link = `${getEnv().NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
  await sendEmail({ to: user.email, ...templates.verifyEmail(user.name, link) });
}

export async function verifyEmail(token: string) {
  const repos = await getRepos();
  const user = await repos.users.consumeEmailVerifyToken(sha256(token));
  if (!user) throw Errors.badRequest('This verification link is invalid or has expired');
  await audit({ userId: user.id, action: 'auth.email_verified', resourceType: 'user', resourceId: user.id });
}

export async function resendVerification(email: string) {
  const repos = await getRepos();
  const user = await repos.users.findByEmail(email);
  if (user && !user.emailVerified) await sendVerification(user);
}

/** Returns the authenticated user or throws a generic error (no account enumeration). */
export async function authenticate(email: string, password: string, ip?: string): Promise<PublicUser> {
  const repos = await getRepos();
  const user = await repos.users.findByEmail(email, true);
  const fail = async (reason: string, uid?: string) => {
    await audit({ userId: uid, ip, action: 'auth.login.failed', resourceType: 'user', resourceId: uid, meta: { reason, email: email.slice(0, 80) } });
    throw Errors.unauthorized('Invalid email or password');
  };

  if (!user || !user.passwordHash) {
    await verifyPassword(password, await getDummyHash()); // keep timing similar
    return fail('unknown_user');
  }
  const lockedUntil = await repos.users.getLockedUntil(user.id);
  if (lockedUntil && lockedUntil > new Date()) return fail('locked', user.id);
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await repos.users.recordLoginFailure(user.id, LOCK_AFTER, LOCK_MS);
    return fail('bad_password', user.id);
  }
  if (user.status === 'blocked' || user.status === 'deactivated') return fail(`status_${user.status}`, user.id);

  await repos.users.recordLoginSuccess(user.id);
  await audit({ userId: user.id, ip, action: 'auth.login.success', resourceType: 'user', resourceId: user.id });
  return strip(user);
}

export async function requestPasswordReset(email: string) {
  const repos = await getRepos();
  const user = await repos.users.findByEmail(email);
  if (!user || user.status === 'blocked' || user.status === 'deactivated') return; // silent
  const token = randomToken(32);
  await repos.users.setResetToken(user.id, sha256(token), new Date(Date.now() + 3600 * 1000));
  await sendEmail({ to: user.email, ...templates.resetPassword(user.name, `${getEnv().NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`) });
  await audit({ userId: user.id, action: 'auth.password_reset.requested', resourceType: 'user', resourceId: user.id });
}

export async function resetPassword(token: string, newPassword: string) {
  const repos = await getRepos();
  const user = await repos.users.consumeResetToken(sha256(token));
  if (!user) throw Errors.badRequest('This reset link is invalid or has expired');
  await repos.users.setPasswordHash(user.id, await hashPassword(newPassword));
  await repos.sessions.revokeAllForUser(user.id);
  await audit({ userId: user.id, action: 'auth.password_reset.completed', resourceType: 'user', resourceId: user.id });
}

export async function changePassword(userId: string, current: string, next: string) {
  const repos = await getRepos();
  const full = await repos.users.findById(userId);
  const withPw = full ? await repos.users.findByEmail(full.email, true) : null;
  if (!withPw?.passwordHash || !(await verifyPassword(current, withPw.passwordHash))) throw Errors.badRequest('Current password is incorrect');
  await repos.users.setPasswordHash(userId, await hashPassword(next));
  await repos.sessions.revokeAllForUser(userId);
  await audit({ userId, action: 'auth.password_changed', resourceType: 'user', resourceId: userId });
}
