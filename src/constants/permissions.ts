/** Single source of truth for RBAC. Seeds, API guards and UI all read from here. */
export const PERMISSIONS = {
  'products.read': 'View products',
  'products.create': 'Create products',
  'products.update': 'Edit products',
  'products.delete': 'Delete / archive products',
  'categories.read': 'View categories',
  'categories.manage': 'Create, edit and delete categories',
  'inventory.read': 'View inventory',
  'inventory.adjust': 'Adjust stock levels',
  'orders.read': 'View orders',
  'orders.update': 'Update order status and shipping',
  'orders.cancel': 'Cancel orders',
  'orders.refund': 'Issue refunds and handle returns',
  'customers.read': 'View customers',
  'customers.update': 'Block / unblock customers',
  'coupons.manage': 'Manage coupons',
  'reviews.moderate': 'Moderate reviews',
  'content.manage': 'Manage banners, pages, FAQ and homepage content',
  'payments.read': 'View payments',
  'reports.read': 'View dashboards and reports',
  'settings.manage': 'Manage store settings',
  'admins.manage': 'Manage admin accounts',
  'roles.manage': 'Manage roles and permissions',
  'audit.read': 'View audit logs',
  'system.manage': 'Manage platform configuration',
  'media.upload': 'Upload media',
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export const ROLE_KEYS = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  PRODUCT_MANAGER: 'product_manager',
  ORDER_MANAGER: 'order_manager',
  INVENTORY_MANAGER: 'inventory_manager',
  SUPPORT_MANAGER: 'support_manager',
  CUSTOMER: 'customer',
} as const;
export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

export interface RoleSeed {
  key: RoleKey;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: Permission[];
}

const ADMIN_PERMS: Permission[] = ALL_PERMISSIONS.filter(
  (p) => !['admins.manage', 'roles.manage', 'system.manage', 'audit.read'].includes(p),
);

export const DEFAULT_ROLES: RoleSeed[] = [
  {
    key: 'super_admin',
    name: 'Super Admin',
    description: 'Complete platform access',
    isSystem: true,
    permissions: ALL_PERMISSIONS,
  },
  { key: 'admin', name: 'Admin', description: 'Access to assigned store modules', isSystem: true, permissions: ADMIN_PERMS },
  {
    key: 'product_manager',
    name: 'Product Manager',
    description: 'Product and category management',
    isSystem: true,
    permissions: [
      'products.read', 'products.create', 'products.update', 'products.delete',
      'categories.read', 'categories.manage', 'media.upload', 'reports.read',
    ],
  },
  {
    key: 'order_manager',
    name: 'Order Manager',
    description: 'Order management',
    isSystem: true,
    permissions: ['orders.read', 'orders.update', 'orders.cancel', 'payments.read', 'customers.read', 'reports.read'],
  },
  {
    key: 'inventory_manager',
    name: 'Inventory Manager',
    description: 'Inventory management',
    isSystem: true,
    permissions: ['inventory.read', 'inventory.adjust', 'products.read', 'reports.read'],
  },
  {
    key: 'support_manager',
    name: 'Support Manager',
    description: 'Customer support and order enquiries',
    isSystem: true,
    permissions: ['customers.read', 'orders.read', 'reviews.moderate', 'payments.read'],
  },
  { key: 'customer', name: 'Customer', description: 'Storefront customer', isSystem: true, permissions: [] },
];

/** Roles that may sign in to /admin. */
export const STAFF_ROLE_KEYS: string[] = [
  'super_admin', 'admin', 'product_manager', 'order_manager', 'inventory_manager', 'support_manager',
];
