import { z } from 'zod';

export const roleSchema = z.enum(['owner', 'admin', 'therapist']);
/** Roles that can be created from the app. Owners are created with `npm run create-owner`. */
export const staffRoleSchema = z.enum(['admin', 'therapist']);

export const createUserSchema = z.object({
  email: z.email(),
  /** Optional: without a password the user signs in with Google (same email). */
  password: z.string().min(8).optional(),
  full_name: z.string().min(1),
  phone: z.string().optional(),
  role: staffRoleSchema,
  branch_ids: z.array(z.uuid()).min(1),
  primary_branch_id: z.uuid().optional(),
  designation: z.string().optional(),
  therapy_types: z.array(z.enum(['speech', 'ot', 'physio', 'other'])).default([]),
});

export const updateRoleSchema = z.object({ role: roleSchema });
export const updateStatusSchema = z.object({ is_active: z.boolean() });
export const setBranchesSchema = z.object({
  branch_ids: z.array(z.uuid()).min(1),
  primary_branch_id: z.uuid().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
