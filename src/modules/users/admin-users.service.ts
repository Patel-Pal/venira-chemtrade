import { getRepos } from '@/database/repositories';
import { ALL_PERMISSIONS, STAFF_ROLE_KEYS } from '@/constants/permissions';
import { requirePermission, type AuthContext } from '@/lib/auth';
import { Errors } from '@/lib/errors';
import { getEnv } from '@/config/env';
import { hashPassword, randomToken, sha256 } from '@/lib/security';
import { sendEmail, templates } from '@/services/email';
import { audit } from '../audit/audit.service';
import type { PublicUser, Role } from '@/types/domain';

const strip = <T extends { passwordHash?: string }>(u: T): Omit<T, 'passwordHash'> => {
  const { passwordHash: _p, ...rest } = u;
  return rest;
};

/** The acting user may only grant permissions they themselves hold (no privilege escalation). */
function assertCanGrant(actor: AuthContext, perms: string[]) {
  const unknown = perms.filter((p) => !(ALL_PERMISSIONS as string[]).includes(p));
  if (unknown.length) throw Errors.badRequest(`Unknown permissions: ${unknown.join(', ')}`);
  if (actor.isSuperAdmin) return;
  const missing = perms.filter((p) => !actor.permissions.has(p));
  if (missing.length) throw Errors.forbidden('You cannot grant permissions you do not have');
}

async function assertRoleAssignable(actor: AuthContext, role: Role) {
  if (role.key === 'customer') throw Errors.badRequest('Use the customer tools for customer accounts');
  if (role.key === 'super_admin' && !actor.isSuperAdmin) throw Errors.forbidden('Only a Super Admin can assign the Super Admin role');
  assertCanGrant(actor, role.permissions);
}

export async function listStaff(q: { page: number; limit: number; search?: string }) {
  const repos = await getRepos();
  const page = await repos.users.list({ ...q, roleKeys: STAFF_ROLE_KEYS });
  return { ...page, items: page.items.map(strip) };
}

export async function createStaff(
  actor: AuthContext,
  input: { name: string; email: string; phone?: string; password?: string; roleKey: string; extraPermissions: string[]; status: 'active' | 'deactivated' },
  ip?: string,
) {
  requirePermission(actor, 'admins.manage');
  const repos = await getRepos();
  if (await repos.users.findByEmail(input.email)) throw Errors.conflict('An account with this email already exists');
  const role = await repos.roles.findByKey(input.roleKey);
  if (!role) throw Errors.badRequest('Role does not exist');
  await assertRoleAssignable(actor, role);
  assertCanGrant(actor, input.extraPermissions);
  const tempPassword = input.password ?? randomToken(12);
  const user = await repos.users.create({
    email: input.email, name: input.name, phone: input.phone, passwordHash: await hashPassword(tempPassword),
    roleId: role.id, roleKey: role.key, extraPermissions: input.extraPermissions, status: input.status, emailVerified: true, authProviders: [],
  });
  await audit({ userId: actor.user.id, ip, action: 'admin.create', resourceType: 'user', resourceId: user.id, after: { email: user.email, role: role.key } });
  // Staff set their own password through the reset flow when none was provided.
  if (!input.password) await sendAccessReset(user.id);
  return strip(user);
}

export async function updateStaff(
  actor: AuthContext, id: string,
  patch: Partial<{ name: string; phone: string; password: string; roleKey: string; extraPermissions: string[]; status: 'active' | 'deactivated' }>,
  ip?: string,
) {
  requirePermission(actor, 'admins.manage');
  const repos = await getRepos();
  const target = await repos.users.findById(id);
  if (!target || !STAFF_ROLE_KEYS.includes(target.roleKey)) throw Errors.notFound('Admin not found');
  if (target.roleKey === 'super_admin' && !actor.isSuperAdmin) throw Errors.forbidden();
  if (target.id === actor.user.id && (patch.roleKey || patch.extraPermissions || patch.status)) {
    throw Errors.forbidden('You cannot change your own role, permissions or status');
  }
  const update: Record<string, unknown> = {};
  if (patch.name) update.name = patch.name;
  if (patch.phone !== undefined) update.phone = patch.phone;
  if (patch.status) update.status = patch.status;
  if (patch.roleKey && patch.roleKey !== target.roleKey) {
    const role = await repos.roles.findByKey(patch.roleKey);
    if (!role) throw Errors.badRequest('Role does not exist');
    await assertRoleAssignable(actor, role);
    update.roleId = role.id;
    update.roleKey = role.key;
  }
  if (patch.extraPermissions) {
    assertCanGrant(actor, patch.extraPermissions);
    update.extraPermissions = patch.extraPermissions;
  }
  if (patch.status === 'active' && target.status !== 'active') update.status = 'active';
  const updated = await repos.users.update(id, update);
  if (patch.password) await repos.users.setPasswordHash(id, await hashPassword(patch.password));
  // Any access-affecting change terminates existing sessions.
  if (patch.status === 'deactivated' || patch.roleKey || patch.extraPermissions || patch.password) await repos.sessions.revokeAllForUser(id);
  await audit({
    userId: actor.user.id, ip, action: 'admin.update', resourceType: 'user', resourceId: id,
    before: { role: target.roleKey, status: target.status, extra: target.extraPermissions },
    after: { role: updated?.roleKey, status: updated?.status, extra: updated?.extraPermissions },
  });
  return updated ? strip(updated) : null;
}

async function sendAccessReset(userId: string) {
  const repos = await getRepos();
  const user = await repos.users.findById(userId);
  if (!user) return;
  const token = randomToken(32);
  await repos.users.setResetToken(user.id, sha256(token), new Date(Date.now() + 3600 * 1000));
  await sendEmail({ to: user.email, ...templates.resetPassword(user.name, `${getEnv().NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`) });
}

export async function resetStaffAccess(actor: AuthContext, id: string, ip?: string) {
  requirePermission(actor, 'admins.manage');
  const repos = await getRepos();
  const target = await repos.users.findById(id);
  if (!target || !STAFF_ROLE_KEYS.includes(target.roleKey)) throw Errors.notFound('Admin not found');
  if (target.roleKey === 'super_admin' && !actor.isSuperAdmin) throw Errors.forbidden();
  const revoked = await repos.sessions.revokeAllForUser(id);
  await sendAccessReset(id);
  await audit({ userId: actor.user.id, ip, action: 'admin.reset_access', resourceType: 'user', resourceId: id, meta: { revoked } });
  return { revoked };
}

export async function revokeSessions(actor: AuthContext, id: string, ip?: string) {
  requirePermission(actor, 'admins.manage');
  const repos = await getRepos();
  const revoked = await repos.sessions.revokeAllForUser(id);
  await audit({ userId: actor.user.id, ip, action: 'admin.sessions_revoked', resourceType: 'user', resourceId: id, meta: { revoked } });
  return { revoked };
}

/* ------------------------------ roles ------------------------------ */
export async function createRole(actor: AuthContext, input: { key: string; name: string; description?: string; permissions: string[] }, ip?: string) {
  requirePermission(actor, 'roles.manage');
  assertCanGrant(actor, input.permissions);
  const repos = await getRepos();
  if (await repos.roles.findByKey(input.key)) throw Errors.conflict('A role with this key already exists');
  const role = await repos.roles.create({ ...input, isSystem: false });
  await audit({ userId: actor.user.id, ip, action: 'role.create', resourceType: 'role', resourceId: role.id, after: role });
  return role;
}

export async function updateRole(actor: AuthContext, id: string, patch: { name?: string; description?: string; permissions?: string[] }, ip?: string) {
  requirePermission(actor, 'roles.manage');
  const repos = await getRepos();
  const role = await repos.roles.findById(id);
  if (!role) throw Errors.notFound('Role not found');
  if (role.key === 'super_admin') throw Errors.forbidden('The Super Admin role cannot be modified');
  if (patch.permissions) {
    assertCanGrant(actor, patch.permissions);
    // also prevent removing permissions you cannot see being removed from higher roles? (granting rule covers escalation)
  }
  const updated = await repos.roles.update(id, patch);
  if (patch.permissions) {
    // Role permission changes take effect immediately because permissions are resolved from the DB on every request.
    await audit({ userId: actor.user.id, ip, action: 'role.permissions_changed', resourceType: 'role', resourceId: id, before: { permissions: role.permissions }, after: { permissions: patch.permissions } });
  } else {
    await audit({ userId: actor.user.id, ip, action: 'role.update', resourceType: 'role', resourceId: id });
  }
  return updated;
}

export async function deleteRole(actor: AuthContext, id: string, ip?: string) {
  requirePermission(actor, 'roles.manage');
  const repos = await getRepos();
  const role = await repos.roles.findById(id);
  if (!role) throw Errors.notFound('Role not found');
  if (role.isSystem) throw Errors.forbidden('System roles cannot be deleted');
  if ((await repos.users.countByRole([role.key])) > 0) throw Errors.conflict('Reassign users with this role before deleting it');
  await repos.roles.delete(id);
  await audit({ userId: actor.user.id, ip, action: 'role.delete', resourceType: 'role', resourceId: id, before: role });
}

/* --------------------------- customers --------------------------- */
export async function listCustomers(q: { page: number; limit: number; search?: string; status?: 'active' | 'blocked' | 'pending' }) {
  const repos = await getRepos();
  const page = await repos.users.list({ ...q, roleKeys: ['customer'] });
  const items = await Promise.all(page.items.map(async (u) => ({ ...strip(u), stats: await repos.orders.customerStats(u.id) })));
  return { ...page, items };
}

export async function getCustomerDetail(id: string) {
  const repos = await getRepos();
  const user = await repos.users.findById(id);
  if (!user || user.roleKey !== 'customer') return null;
  const [addresses, orders, stats] = await Promise.all([repos.addresses.listByUser(id), repos.orders.list({ page: 1, limit: 50, userId: id }), repos.orders.customerStats(id)]);
  return { user: strip(user) as PublicUser, addresses, orders: orders.items, stats };
}

export async function setCustomerBlocked(actor: AuthContext, id: string, blocked: boolean, ip?: string) {
  requirePermission(actor, 'customers.update');
  const repos = await getRepos();
  const user = await repos.users.findById(id);
  if (!user || user.roleKey !== 'customer') throw Errors.notFound('Customer not found');
  await repos.users.update(id, { status: blocked ? 'blocked' : user.emailVerified ? 'active' : 'pending' });
  if (blocked) await repos.sessions.revokeAllForUser(id);
  await audit({ userId: actor.user.id, ip, action: blocked ? 'customer.block' : 'customer.unblock', resourceType: 'user', resourceId: id });
}
