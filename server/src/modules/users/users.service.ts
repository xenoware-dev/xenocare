import { supabaseAdmin } from '../../lib/supabase.js';
import type { AppRole, AuthUser } from '../../middleware/auth.js';
import { AppError, unwrap } from '../../utils/AppError.js';
import type { CreateUserInput } from './users.schema.js';

function branchRows(profileId: string, branchIds: string[], primaryId?: string) {
  const primary = primaryId && branchIds.includes(primaryId) ? primaryId : branchIds[0];
  return branchIds.map((branch_id) => ({ profile_id: profileId, branch_id, is_primary: branch_id === primary }));
}

/** Owner manages everyone; admins manage only therapists who share one of their branches. */
async function assertCanManage(actor: AuthUser, targetId: string) {
  if (actor.role === 'owner') return;
  const target = unwrap(
    await supabaseAdmin.from('profiles').select('role').eq('id', targetId).single(),
  ) as { role: AppRole };
  const { data: shared } = await supabaseAdmin
    .from('staff_branches')
    .select('branch_id')
    .eq('profile_id', targetId)
    .in('branch_id', actor.branchIds);
  if (target.role !== 'therapist' || !shared?.length) throw AppError.forbidden();
}

export async function createUser(actor: AuthUser, input: CreateUserInput) {
  // Workflow: the owner creates branch admins; branch admins create therapists in their branches.
  if (actor.role === 'owner' && input.role !== 'admin') {
    throw AppError.forbidden('The owner creates branch admins. Therapists are added by their branch admin.');
  }
  if (actor.role === 'admin') {
    if (input.role !== 'therapist') throw AppError.forbidden('Branch admins can only add therapists');
    if (!input.branch_ids.every((id) => actor.branchIds.includes(id))) {
      throw AppError.forbidden('You can only assign your own branches');
    }
  }

  // email_confirm lets the user sign in with Google right away: Supabase links the
  // Google identity to this account because the email is already verified.
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name },
    app_metadata: { role: input.role },
  });
  if (error) {
    if (error.code === 'email_exists') throw AppError.conflict('A user with this email already exists');
    throw AppError.badRequest(error.message);
  }
  const id = data.user.id;

  try {
    // The on_auth_user_created trigger creates the profile, but Supabase sets app_metadata after
    // the insert, so the trigger sees no role and leaves it inactive. Activate it here.
    unwrap(
      await supabaseAdmin
        .from('profiles')
        .update({ role: input.role, is_active: true, full_name: input.full_name, phone: input.phone ?? null })
        .eq('id', id),
    );
    unwrap(await supabaseAdmin.from('staff_branches').insert(branchRows(id, input.branch_ids, input.primary_branch_id)));
    unwrap(
      await supabaseAdmin.from('staff_details').insert({
        profile_id: id,
        designation: input.designation ?? null,
        therapy_types: input.therapy_types,
      }),
    );
  } catch (err) {
    await supabaseAdmin.auth.admin.deleteUser(id); // roll back the half-created user
    throw err;
  }

  return { id, email: input.email, role: input.role };
}

export async function updateRole(userId: string, role: AppRole) {
  unwrap(await supabaseAdmin.from('profiles').update({ role }).eq('id', userId));
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { app_metadata: { role } });
  if (error) throw AppError.badRequest(error.message);
}

export async function updateStatus(actor: AuthUser, userId: string, isActive: boolean) {
  if (userId === actor.id) throw AppError.badRequest('You cannot deactivate yourself');
  await assertCanManage(actor, userId);
  unwrap(await supabaseAdmin.from('profiles').update({ is_active: isActive }).eq('id', userId));
  // Ban blocks new logins / token refresh; the DB checks is_active on every request.
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: isActive ? 'none' : '876000h',
  });
  if (error) throw AppError.badRequest(error.message);
}

export async function setBranches(userId: string, branchIds: string[], primaryId?: string) {
  unwrap(await supabaseAdmin.from('staff_branches').delete().eq('profile_id', userId));
  unwrap(await supabaseAdmin.from('staff_branches').insert(branchRows(userId, branchIds, primaryId)));
}
