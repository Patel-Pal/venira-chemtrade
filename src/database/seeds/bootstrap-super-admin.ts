/**
 * One-time Super Admin bootstrap: npm run bootstrap:superadmin
 * Requires BOOTSTRAP_SUPER_ADMIN_EMAIL / BOOTSTRAP_SUPER_ADMIN_PASSWORD in the environment.
 * Refuses to run if a super admin already exists. Remove both variables afterwards.
 */
import { getRepos } from '../repositories';
import { hashPassword } from '@/lib/security';
import { emailSchema, passwordSchema } from '@/schemas';

async function main() {
  const repos = await getRepos();
  const role = await repos.roles.findByKey('super_admin');
  if (!role) throw new Error('Run `npm run seed` first (roles are missing).');
  if ((await repos.users.countByRole(['super_admin'])) > 0) {
    console.error('A super admin already exists. Aborting.');
    process.exit(2);
  }
  const email = emailSchema.parse(process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL);
  const password = passwordSchema.min(12).parse(process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD);
  const u = await repos.users.create({
    email, name: 'Super Admin', passwordHash: await hashPassword(password), roleId: role.id, roleKey: role.key,
    extraPermissions: [], status: 'active', emailVerified: true, authProviders: [],
  });
  await repos.audit.append({ action: 'bootstrap.super_admin', resourceType: 'user', resourceId: u.id });
  console.log(`Super admin created: ${email}. Remove BOOTSTRAP_* variables from your environment now.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
