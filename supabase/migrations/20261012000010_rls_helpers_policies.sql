-- =============================================================================
-- Row Level Security
--   owner     : everything, all branches
--   admin     : everything inside the branches listed in staff_branches
--   therapist : own schedule + clinical records of students assigned to them;
--               no billing, no audit, no WhatsApp logs
-- Express uses the service role (bypasses RLS) for system jobs.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Helper functions (security definer => they bypass RLS internally, so
-- policies can call them without recursion).
-- ----------------------------------------------------------------------------
create or replace function private.user_role()
returns public.app_role
language sql stable security definer set search_path = ''
as $$
  select p.role
    from public.profiles p
   where p.id = auth.uid()
     and p.is_active
     and p.deleted_at is null
$$;

create or replace function private.is_owner()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(private.user_role() = 'owner', false)
$$;

create or replace function private.is_admin()   -- owner or admin
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(private.user_role() in ('owner', 'admin'), false)
$$;

create or replace function private.has_branch_access(p_branch_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_owner()
      or (private.user_role() is not null
          and exists (select 1 from public.staff_branches sb
                       where sb.profile_id = auth.uid() and sb.branch_id = p_branch_id))
$$;

create or replace function private.is_branch_admin(p_branch_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_owner()
      or (private.user_role() = 'admin'
          and exists (select 1 from public.staff_branches sb
                       where sb.profile_id = auth.uid() and sb.branch_id = p_branch_id))
$$;

-- True when the current user shares at least one branch with p_profile_id.
create or replace function private.shares_branch(p_profile_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.user_role() is not null
     and exists (select 1
                   from public.staff_branches me
                   join public.staff_branches other on other.branch_id = me.branch_id
                  where me.profile_id = auth.uid() and other.profile_id = p_profile_id)
$$;

create or replace function private.is_assigned_therapist(p_student_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.user_role() is not null
     and exists (select 1 from public.student_therapists st
                  where st.student_id = p_student_id
                    and st.therapist_id = auth.uid()
                    and (st.end_date is null or st.end_date >= current_date))
$$;

-- Admin of the student's home branch (or owner).
create or replace function private.can_manage_student(p_student_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_owner()
      or exists (select 1 from public.students s
                  where s.id = p_student_id and private.is_branch_admin(s.home_branch_id))
$$;

-- Home-branch admin, admin of any branch where the student is treated,
-- or an assigned therapist.
create or replace function private.can_view_student(p_student_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.can_manage_student(p_student_id)
      or private.is_assigned_therapist(p_student_id)
      or exists (select 1 from public.student_therapists st
                  where st.student_id = p_student_id and private.is_branch_admin(st.branch_id))
$$;

-- For UI / Express checks: role defaults plus per-user overrides.
create or replace function private.has_permission(p_key text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when private.is_owner() then true
    else coalesce(
      (select o.granted from public.user_permission_overrides o
        where o.profile_id = auth.uid() and o.permission_key = p_key),
      exists (select 1 from public.role_permissions rp
               where rp.role = private.user_role() and rp.permission_key = p_key))
  end
$$;

-- Callable from React: supabase.rpc('my_permissions')
create or replace function public.my_permissions()
returns setof text
language sql stable security definer set search_path = ''
as $$
  select p.key from public.permissions p where private.has_permission(p.key)
$$;

-- Safe text -> uuid cast (null on bad input); used by storage policies.
create or replace function private.try_uuid(p_text text)
returns uuid
language plpgsql immutable set search_path = ''
as $$
begin
  return p_text::uuid;
exception when others then
  return null;
end;
$$;

grant execute on all functions in schema private to authenticated, service_role;
revoke execute on function public.my_permissions() from anon;

-- ----------------------------------------------------------------------------
-- Lock down anon, enable RLS everywhere
-- ----------------------------------------------------------------------------
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;

do $$
declare
  r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- Organization & branches
-- ----------------------------------------------------------------------------
create policy org_select on public.organization_settings for select to authenticated using (true);
create policy org_update on public.organization_settings for update to authenticated
  using (private.is_owner()) with check (private.is_owner());

create policy branches_select on public.branches for select to authenticated
  using (private.has_branch_access(id));
create policy branches_write on public.branches for all to authenticated
  using (private.is_owner()) with check (private.is_owner());

create policy branch_holidays_select on public.branch_holidays for select to authenticated
  using (private.has_branch_access(branch_id));
create policy branch_holidays_write on public.branch_holidays for all to authenticated
  using (private.is_branch_admin(branch_id)) with check (private.is_branch_admin(branch_id));

create policy rooms_select on public.rooms for select to authenticated
  using (private.has_branch_access(branch_id));
create policy rooms_write on public.rooms for all to authenticated
  using (private.is_branch_admin(branch_id)) with check (private.is_branch_admin(branch_id));

-- ----------------------------------------------------------------------------
-- Profiles, membership, permissions
-- ----------------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or private.is_owner() or private.shares_branch(id));
-- Column grants (migration 0002) limit this to full_name / phone / avatar_url.
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy staff_branches_select on public.staff_branches for select to authenticated
  using (profile_id = auth.uid() or private.has_branch_access(branch_id));
create policy staff_branches_write on public.staff_branches for all to authenticated
  using (private.is_owner()) with check (private.is_owner());

create policy permissions_select on public.permissions for select to authenticated using (true);
create policy permissions_write on public.permissions for all to authenticated
  using (private.is_owner()) with check (private.is_owner());

create policy role_permissions_select on public.role_permissions for select to authenticated using (true);
create policy role_permissions_write on public.role_permissions for all to authenticated
  using (private.is_owner()) with check (private.is_owner());

create policy upo_select on public.user_permission_overrides for select to authenticated
  using (profile_id = auth.uid() or private.is_owner());
create policy upo_write on public.user_permission_overrides for all to authenticated
  using (private.is_owner()) with check (private.is_owner());

-- ----------------------------------------------------------------------------
-- Staff
-- ----------------------------------------------------------------------------
create policy staff_details_select on public.staff_details for select to authenticated
  using (profile_id = auth.uid() or private.is_owner()
         or (private.is_admin() and private.shares_branch(profile_id)));
create policy staff_details_write on public.staff_details for all to authenticated
  using (private.is_owner() or (private.is_admin() and private.shares_branch(profile_id)))
  with check (private.is_owner() or (private.is_admin() and private.shares_branch(profile_id)));

create policy availability_select on public.therapist_availability for select to authenticated
  using (private.has_branch_access(branch_id));
create policy availability_write on public.therapist_availability for all to authenticated
  using (private.is_branch_admin(branch_id)) with check (private.is_branch_admin(branch_id));

create policy leaves_select on public.staff_leaves for select to authenticated
  using (profile_id = auth.uid() or private.is_owner()
         or (private.is_admin() and private.shares_branch(profile_id)));
create policy leaves_insert on public.staff_leaves for insert to authenticated
  with check (profile_id = auth.uid() or private.is_owner()
              or (private.is_admin() and private.shares_branch(profile_id)));
create policy leaves_update on public.staff_leaves for update to authenticated
  using (private.is_owner()
         or (private.is_admin() and private.shares_branch(profile_id))
         or (profile_id = auth.uid() and status = 'pending'))
  with check (private.is_owner()
              or (private.is_admin() and private.shares_branch(profile_id))
              or (profile_id = auth.uid() and status in ('pending', 'cancelled')));
create policy leaves_delete on public.staff_leaves for delete to authenticated
  using (private.is_owner() or (profile_id = auth.uid() and status = 'pending'));

create policy staff_attendance_select on public.staff_attendance for select to authenticated
  using (profile_id = auth.uid() or private.is_branch_admin(branch_id));
create policy staff_attendance_write on public.staff_attendance for all to authenticated
  using (private.is_branch_admin(branch_id)) with check (private.is_branch_admin(branch_id));

-- ----------------------------------------------------------------------------
-- Students & parents
-- ----------------------------------------------------------------------------
create policy students_select on public.students for select to authenticated
  using (private.is_branch_admin(home_branch_id)
         or private.is_assigned_therapist(id)
         or exists (select 1 from public.student_therapists st
                     where st.student_id = students.id and private.is_branch_admin(st.branch_id)));
create policy students_insert on public.students for insert to authenticated
  with check (private.is_branch_admin(home_branch_id));
create policy students_update on public.students for update to authenticated
  using (private.is_branch_admin(home_branch_id))
  with check (private.is_branch_admin(home_branch_id));
create policy students_delete on public.students for delete to authenticated
  using (private.is_owner());

create policy parents_select on public.parents for select to authenticated
  using (private.is_owner()
         or created_by = auth.uid()
         or exists (select 1 from public.student_parents sp
                     where sp.parent_id = parents.id and private.can_view_student(sp.student_id)));
create policy parents_insert on public.parents for insert to authenticated
  with check (private.is_admin());
create policy parents_update on public.parents for update to authenticated
  using (private.is_owner()
         or created_by = auth.uid()
         or exists (select 1 from public.student_parents sp
                     where sp.parent_id = parents.id and private.can_manage_student(sp.student_id)))
  with check (private.is_admin());
create policy parents_delete on public.parents for delete to authenticated
  using (private.is_owner());

create policy student_parents_select on public.student_parents for select to authenticated
  using (private.can_view_student(student_id));
create policy student_parents_write on public.student_parents for all to authenticated
  using (private.can_manage_student(student_id)) with check (private.can_manage_student(student_id));

create policy student_therapists_select on public.student_therapists for select to authenticated
  using (therapist_id = auth.uid() or private.can_view_student(student_id));
create policy student_therapists_write on public.student_therapists for all to authenticated
  using (private.is_branch_admin(branch_id)) with check (private.is_branch_admin(branch_id));

create policy student_documents_select on public.student_documents for select to authenticated
  using (private.can_view_student(student_id));
create policy student_documents_insert on public.student_documents for insert to authenticated
  with check (private.can_view_student(student_id) and uploaded_by = auth.uid());
create policy student_documents_delete on public.student_documents for delete to authenticated
  using (private.can_manage_student(student_id) or uploaded_by = auth.uid());

-- ----------------------------------------------------------------------------
-- Templates
-- ----------------------------------------------------------------------------
create policy form_templates_select on public.form_templates for select to authenticated using (true);
create policy form_templates_write on public.form_templates for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

create policy message_templates_select on public.message_templates for select to authenticated
  using (private.is_admin());
create policy message_templates_write on public.message_templates for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- ----------------------------------------------------------------------------
-- Clinical records: same rules for assessments, plans, sessions, reports
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['assessments', 'treatment_plans', 'therapy_sessions', 'progress_reports'] loop
    execute format($f$
      create policy %1$s_select on public.%1$I for select to authenticated
        using (private.is_branch_admin(branch_id)
               or therapist_id = auth.uid()
               or private.is_assigned_therapist(student_id));
      create policy %1$s_insert on public.%1$I for insert to authenticated
        with check (private.is_branch_admin(branch_id)
                    or (therapist_id = auth.uid()
                        and private.is_assigned_therapist(student_id)
                        and private.has_branch_access(branch_id)));
      create policy %1$s_update on public.%1$I for update to authenticated
        using (private.is_branch_admin(branch_id) or therapist_id = auth.uid())
        with check (private.is_branch_admin(branch_id)
                    or (therapist_id = auth.uid()
                        and private.is_assigned_therapist(student_id)
                        and private.has_branch_access(branch_id)));
      create policy %1$s_delete on public.%1$I for delete to authenticated
        using (private.is_branch_admin(branch_id));
    $f$, t);
  end loop;
end;
$$;

-- Goals inherit access from their plan.
create policy therapy_goals_select on public.therapy_goals for select to authenticated
  using (exists (select 1 from public.treatment_plans tp where tp.id = therapy_goals.plan_id));
create policy therapy_goals_write on public.therapy_goals for all to authenticated
  using (exists (select 1 from public.treatment_plans tp
                  where tp.id = therapy_goals.plan_id
                    and (private.is_branch_admin(tp.branch_id) or tp.therapist_id = auth.uid())))
  with check (exists (select 1 from public.treatment_plans tp
                       where tp.id = therapy_goals.plan_id
                         and (private.is_branch_admin(tp.branch_id) or tp.therapist_id = auth.uid())));

create policy goal_progress_select on public.goal_progress for select to authenticated
  using (exists (select 1 from public.therapy_goals g where g.id = goal_progress.goal_id));
create policy goal_progress_write on public.goal_progress for all to authenticated
  using (exists (select 1 from public.therapy_goals g
                   join public.treatment_plans tp on tp.id = g.plan_id
                  where g.id = goal_progress.goal_id
                    and (private.is_branch_admin(tp.branch_id) or tp.therapist_id = auth.uid())))
  with check (exists (select 1 from public.therapy_goals g
                        join public.treatment_plans tp on tp.id = g.plan_id
                       where g.id = goal_progress.goal_id
                         and (private.is_branch_admin(tp.branch_id) or tp.therapist_id = auth.uid())));

-- ----------------------------------------------------------------------------
-- Scheduling & attendance
-- ----------------------------------------------------------------------------
create policy appointments_select on public.appointments for select to authenticated
  using (private.is_branch_admin(branch_id) or therapist_id = auth.uid());
create policy appointments_insert on public.appointments for insert to authenticated
  with check (private.is_branch_admin(branch_id));
-- Therapists may update their own appointments (e.g. mark completed / no_show).
create policy appointments_update on public.appointments for update to authenticated
  using (private.is_branch_admin(branch_id) or therapist_id = auth.uid())
  with check (private.is_branch_admin(branch_id) or therapist_id = auth.uid());
create policy appointments_delete on public.appointments for delete to authenticated
  using (private.is_branch_admin(branch_id));

create policy recurrence_select on public.recurrence_groups for select to authenticated
  using (private.is_branch_admin(branch_id) or therapist_id = auth.uid());
create policy recurrence_write on public.recurrence_groups for all to authenticated
  using (private.is_branch_admin(branch_id)) with check (private.is_branch_admin(branch_id));

create policy student_attendance_select on public.student_attendance for select to authenticated
  using (private.is_branch_admin(branch_id)
         or exists (select 1 from public.appointments a
                     where a.id = student_attendance.appointment_id and a.therapist_id = auth.uid()));
create policy student_attendance_insert on public.student_attendance for insert to authenticated
  with check (private.is_branch_admin(branch_id)
              or exists (select 1 from public.appointments a
                          where a.id = student_attendance.appointment_id and a.therapist_id = auth.uid()));
create policy student_attendance_update on public.student_attendance for update to authenticated
  using (private.is_branch_admin(branch_id)
         or exists (select 1 from public.appointments a
                     where a.id = student_attendance.appointment_id and a.therapist_id = auth.uid()))
  with check (private.is_branch_admin(branch_id)
              or exists (select 1 from public.appointments a
                          where a.id = student_attendance.appointment_id and a.therapist_id = auth.uid()));
create policy student_attendance_delete on public.student_attendance for delete to authenticated
  using (private.is_branch_admin(branch_id));

-- ----------------------------------------------------------------------------
-- Billing: owner + branch admins only
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['fee_plans', 'student_fee_assignments', 'invoices', 'payments'] loop
    execute format($f$
      create policy %1$s_admin on public.%1$I for all to authenticated
        using (private.is_branch_admin(branch_id))
        with check (private.is_branch_admin(branch_id));
    $f$, t);
  end loop;
end;
$$;

create policy invoice_items_admin on public.invoice_items for all to authenticated
  using (exists (select 1 from public.invoices i
                  where i.id = invoice_items.invoice_id and private.is_branch_admin(i.branch_id)))
  with check (exists (select 1 from public.invoices i
                       where i.id = invoice_items.invoice_id and private.is_branch_admin(i.branch_id)));

-- invoice_counters: RLS on, no policies (only the trigger touches it).

-- ----------------------------------------------------------------------------
-- WhatsApp & automation
-- ----------------------------------------------------------------------------
create policy whatsapp_messages_select on public.whatsapp_messages for select to authenticated
  using (private.is_branch_admin(branch_id));
-- Admins may queue a message; Express picks up 'queued' rows and updates status.
create policy whatsapp_messages_insert on public.whatsapp_messages for insert to authenticated
  with check (private.is_branch_admin(branch_id) and status = 'queued' and sent_by = auth.uid());

create policy notification_schedules_select on public.notification_schedules for select to authenticated
  using (private.is_admin());
create policy notification_schedules_write on public.notification_schedules for all to authenticated
  using (private.is_owner() or (branch_id is not null and private.is_branch_admin(branch_id)))
  with check (private.is_owner() or (branch_id is not null and private.is_branch_admin(branch_id)));

-- ----------------------------------------------------------------------------
-- Audit log: read-only
-- ----------------------------------------------------------------------------
create policy audit_logs_select on public.audit_logs for select to authenticated
  using (private.is_owner() or (branch_id is not null and private.is_branch_admin(branch_id)));
