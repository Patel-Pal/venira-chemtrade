/**
 * Creates the initial staff accounts from environment variables:  npm run bootstrap:admins
 *
 *   BOOTSTRAP_SUPER_ADMIN_EMAIL / BOOTSTRAP_SUPER_ADMIN_PASSWORD   (password >= 12 chars)
 *   BOOTSTRAP_ADMIN_EMAIL       / BOOTSTRAP_ADMIN_PASSWORD         (optional, password >= 8 chars)
 *
 * Idempotent: an account whose email already exists is skipped (never overwritten).
 * Run `npm run seed` first (roles must exist). Remove the BOOTSTRAP_* variables afterwards.
 */
import { getRepos } from '../repositories';
import { hashPassword } from '@/lib/security';
import { emailSchema, passwordSchema } from '@/schemas';

async function ensureUser(roleKey: 'super_admin' | 'admin', name: string, emailRaw: string | undefined, passwordRaw: string | undefined, minLen: number) {
  if (!emailRaw && !passwordRaw) return console.log(`- ${roleKey}: skipped (no BOOTSTRAP_* variables set)`);
  const email = emailSchema.parse(emailRaw);
  const password = passwordSchema.min(minLen).parse(passwordRaw);
  const repos = await getRepos();
  const role = await repos.roles.findByKey(roleKey);
  if (!role) throw new Error('Roles are missing - run `npm run seed` first.');
  if (await repos.users.findByEmail(email)) return console.log(`- ${roleKey}: ${email} already exists, left unchanged`);
  const u = await repos.users.create({
    email, name, passwordHash: await hashPassword(password), roleId: role.id, roleKey: role.key,
    extraPermissions: [], status: 'active', emailVerified: true, authProviders: [],
  });
  await repos.audit.append({ action: `bootstrap.${roleKey}`, resourceType: 'user', resourceId: u.id });
  console.log(`- ${roleKey}: created ${email}`);
}

async function main() {
  const e = process.env;
  await ensureUser('super_admin', 'Super Admin', e.BOOTSTRAP_SUPER_ADMIN_EMAIL, e.BOOTSTRAP_SUPER_ADMIN_PASSWORD, 12);
  await ensureUser('admin', 'Admin', e.BOOTSTRAP_ADMIN_EMAIL, e.BOOTSTRAP_ADMIN_PASSWORD, 8);
  console.log('Done. Remove BOOTSTRAP_* variables from your environment now.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
