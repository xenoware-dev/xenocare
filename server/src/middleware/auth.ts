import type { NextFunction, Request, Response } from 'express';
import { createUserClient, supabaseAdmin } from '../lib/supabase.js';
import { AppError } from '../utils/AppError.js';

export type AppRole = 'owner' | 'admin' | 'therapist';

export interface AuthUser {
  id: string;
  email: string | undefined;
  role: AppRole;
  branchIds: string[];
}

/** Verifies the Supabase JWT and loads role + branches from the database. */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return next(AppError.unauthorized());

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return next(AppError.unauthorized('Invalid or expired session'));

  const [{ data: profile }, { data: branches }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('role, is_active, deleted_at')
      .eq('id', data.user.id)
      .single(),
    supabaseAdmin.from('staff_branches').select('branch_id').eq('profile_id', data.user.id),
  ]);

  if (!profile || !profile.is_active || profile.deleted_at) {
    return next(AppError.forbidden('Account is inactive'));
  }

  req.user = {
    id: data.user.id,
    email: data.user.email,
    role: profile.role as AppRole,
    branchIds: (branches ?? []).map((b: { branch_id: string }) => b.branch_id),
  };
  req.db = createUserClient(token);
  next();
}

export function requireRole(...roles: AppRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden());
    next();
  };
}
