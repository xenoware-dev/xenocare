import type { AuthUser } from '../middleware/auth.js';
import { AppError } from './AppError.js';

export function canAccessBranch(user: AuthUser, branchId: string) {
  return user.role === 'owner' || user.branchIds.includes(branchId);
}

export function assertBranchAdmin(user: AuthUser, branchId: string) {
  const ok = user.role === 'owner' || (user.role === 'admin' && user.branchIds.includes(branchId));
  if (!ok) throw AppError.forbidden('You are not an admin of this branch');
}

/** Branch admin by membership; the owner does not run day-to-day branch work. */
export function assertBranchManager(user: AuthUser, branchId: string) {
  if (user.role !== 'admin' || !user.branchIds.includes(branchId)) {
    throw AppError.forbidden('Only the admin of this branch can do this');
  }
}
