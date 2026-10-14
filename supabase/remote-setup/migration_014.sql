-- Paste into Dashboard -> SQL Editor. Applies migration 20261014000014.
begin;
-- =============================================================================
-- Role workflow
--   owner     : creates branches and branch admins; views everything
--   admin     : creates therapists, patients (students + parents) and
--               appointments, only in the branches they belong to
--   therapist : works on their own appointments and assigned patients
-- =============================================================================

-- Admin of the branch by membership (the owner is NOT included).
create or replace function private.is_branch_manager(p_branch_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.user_role() = 'admin'
     and exists (select 1 from public.staff_branches sb
                  where sb.profile_id = auth.uid() and sb.branch_id = p_branch_id)
$$;
grant execute on function private.is_branch_manager(uuid) to authenticated, service_role;

-- Branch admin (not owner) of the student's home branch.
create or replace function private.manages_student(p_student_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.students s
                  where s.id = p_student_id and private.is_branch_manager(s.home_branch_id))
$$;
grant execute on function private.manages_student(uuid) to authenticated, service_role;

-- Permissions come from role_permissions for every role (the owner is no longer
-- granted everything implicitly); per-user overrides still apply.
create or replace function private.has_permission(p_key text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select o.granted from public.user_permission_overrides o
      where o.profile_id = auth.uid() and o.permission_key = p_key),
    exists (select 1 from public.role_permissions rp
             where rp.role = private.user_role() and rp.permission_key = p_key))
$$;

delete from public.role_permissions
 where role = 'owner'
   and permission_key in ('students.manage', 'parents.manage', 'appointments.manage', 'attendance.mark',
                          'sessions.write', 'assessments.write', 'plans.write', 'reports.write',
                          'billing.manage', 'whatsapp.send');

-- Patients: created and edited by branch admins only.
drop policy if exists students_insert on public.students;
drop policy if exists students_update on public.students;
create policy students_insert on public.students for insert to authenticated
  with check (private.is_branch_manager(home_branch_id));
create policy students_update on public.students for update to authenticated
  using (private.is_branch_manager(home_branch_id))
  with check (private.is_branch_manager(home_branch_id));

drop policy if exists parents_insert on public.parents;
drop policy if exists parents_update on public.parents;
create policy parents_insert on public.parents for insert to authenticated
  with check (private.user_role() = 'admin');
create policy parents_update on public.parents for update to authenticated
  using (created_by = auth.uid()
         or exists (select 1 from public.student_parents sp
                     where sp.parent_id = parents.id and private.manages_student(sp.student_id)))
  with check (private.user_role() = 'admin');

drop policy if exists student_parents_write on public.student_parents;
create policy student_parents_write on public.student_parents for all to authenticated
  using (private.manages_student(student_id)) with check (private.manages_student(student_id));

drop policy if exists student_therapists_write on public.student_therapists;
create policy student_therapists_write on public.student_therapists for all to authenticated
  using (private.is_branch_manager(branch_id)) with check (private.is_branch_manager(branch_id));

-- Schedules: created, rescheduled and cancelled by branch admins; therapists may
-- still update the status of their own appointments.
drop policy if exists appointments_insert on public.appointments;
drop policy if exists appointments_update on public.appointments;
drop policy if exists appointments_delete on public.appointments;
create policy appointments_insert on public.appointments for insert to authenticated
  with check (private.is_branch_manager(branch_id));
create policy appointments_update on public.appointments for update to authenticated
  using (private.is_branch_manager(branch_id) or therapist_id = auth.uid())
  with check (private.is_branch_manager(branch_id) or therapist_id = auth.uid());
create policy appointments_delete on public.appointments for delete to authenticated
  using (private.is_branch_manager(branch_id));

drop policy if exists recurrence_write on public.recurrence_groups;
create policy recurrence_write on public.recurrence_groups for all to authenticated
  using (private.is_branch_manager(branch_id)) with check (private.is_branch_manager(branch_id));

insert into supabase_migrations.schema_migrations (version, name) values ('20261014000014', 'role_workflow') on conflict do nothing;
commit;
