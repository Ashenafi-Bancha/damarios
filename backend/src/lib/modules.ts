import type { Role } from '@prisma/client';

/** Admin modules. Each admin route is guarded by one of these. */
export const MODULES = [
  'dashboard',
  'orders',
  'customers',
  'production',
  'inventory',
  'training',
  'fashion',
  'employees',
  'payroll',
  'recruitment',
  'finance',
  'website',
  'users',
  'settings',
] as const;

export type ModuleName = (typeof MODULES)[number];

/** Starting permissions. The owner can change them in Users & roles. */
export const DEFAULT_PERMISSIONS: Record<Exclude<Role, 'OWNER'>, ModuleName[]> = {
  MANAGER: ['dashboard', 'orders', 'customers', 'production', 'inventory', 'training', 'fashion', 'employees', 'recruitment', 'website'],
  DESIGNER: ['orders', 'production', 'fashion', 'training'],
  ACCOUNTANT: ['dashboard', 'employees', 'payroll', 'finance', 'training'],
  STOREKEEPER: ['inventory', 'production'],
  SALES: ['orders', 'customers', 'fashion'],
};
