/** Single source for admin navigation (server- and client-safe: no JSX). Icons are mapped in AdminShell. */
export interface NavLink {
  href: string;
  label: string;
  perm?: string;
}

export const ADMIN_LINKS: NavLink[] = [
  { href: '/admin', label: 'Dashboard', perm: 'reports.read' },
  { href: '/admin/products', label: 'Products', perm: 'products.read' },
  { href: '/admin/categories', label: 'Categories', perm: 'categories.read' },
  { href: '/admin/inventory', label: 'Inventory', perm: 'inventory.read' },
  { href: '/admin/orders', label: 'Orders', perm: 'orders.read' },
  { href: '/admin/customers', label: 'Customers', perm: 'customers.read' },
  { href: '/admin/coupons', label: 'Coupons', perm: 'coupons.manage' },
  { href: '/admin/reviews', label: 'Reviews', perm: 'reviews.moderate' },
  { href: '/admin/banners', label: 'Banners & content', perm: 'content.manage' },
  { href: '/admin/payments', label: 'Payments', perm: 'payments.read' },
  { href: '/admin/reports', label: 'Reports', perm: 'reports.read' },
  { href: '/admin/settings', label: 'Settings', perm: 'settings.manage' },
];

export const SUPER_LINKS: NavLink[] = [
  { href: '/super-admin', label: 'Platform overview' },
  { href: '/super-admin/admins', label: 'Admins', perm: 'admins.manage' },
  { href: '/super-admin/roles', label: 'Roles', perm: 'roles.manage' },
  { href: '/super-admin/permissions', label: 'Permissions', perm: 'roles.manage' },
  { href: '/super-admin/analytics', label: 'Analytics', perm: 'system.manage' },
  { href: '/super-admin/audit-logs', label: 'Audit logs', perm: 'audit.read' },
  { href: '/super-admin/settings', label: 'System config', perm: 'system.manage' },
];
