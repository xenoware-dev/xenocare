-- =============================================================================
-- Progress reports, audit log, and trigger wiring for all tables
-- =============================================================================

create table public.progress_reports (
  id                      uuid primary key default gen_random_uuid(),
  student_id              uuid not null references public.students(id) on delete cascade,
  branch_id               uuid not null references public.branches(id) on delete restrict,
  therapist_id            uuid not null references public.profiles(id) on delete restrict,
  template_id             uuid references public.form_templates(id) on delete restrict,
  therapy_type            public.therapy_type not null,
  period_start            date not null,
  period_end              date not null,
  content                 jsonb not null default '{}'::jsonb,
  summary                 text,
  pdf_path                text,          -- Storage: reports/{student_id}/...
  status                  public.record_status not null default 'draft',
  finalized_at            timestamptz,
  shared_via_whatsapp_at  timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  check (period_end >= period_start)
);
create index progress_reports_student_idx   on public.progress_reports (student_id, period_end desc);
create index progress_reports_branch_idx    on public.progress_reports (branch_id);
create index progress_reports_therapist_idx on public.progress_reports (therapist_id);
create index progress_reports_template_idx  on public.progress_reports (template_id);

-- ----------------------------------------------------------------------------
-- Audit log (append-only; written only by trigger)
-- ----------------------------------------------------------------------------
create table public.audit_logs (
  id           bigint generated always as identity primary key,
  occurred_at  timestamptz not null default now(),
  actor_id     uuid,              -- auth.uid(); null = service role / system
  action       text not null,     -- insert / update / delete
  table_name   text not null,
  record_id    uuid,
  branch_id    uuid,
  old_data     jsonb,
  new_data     jsonb
);
create index audit_logs_record_idx on public.audit_logs (table_name, record_id);
create index audit_logs_branch_idx on public.audit_logs (branch_id, occurred_at desc);
create index audit_logs_actor_idx  on public.audit_logs (actor_id, occurred_at desc);

create or replace function private.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_rec jsonb;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_old := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_new := to_jsonb(new); end if;
  v_rec := coalesce(v_new, v_old);

  insert into public.audit_logs (actor_id, action, table_name, record_id, branch_id, old_data, new_data)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(v_rec ->> 'id', v_rec ->> 'profile_id')::uuid,
    coalesce(v_rec ->> 'branch_id', v_rec ->> 'home_branch_id')::uuid,
    v_old,
    v_new
  );
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'staff_branches', 'staff_details',
    'students', 'parents', 'student_parents', 'student_therapists',
    'assessments', 'treatment_plans', 'therapy_goals', 'therapy_sessions', 'progress_reports',
    'appointments', 'student_attendance',
    'fee_plans', 'invoices', 'payments'
  ] loop
    execute format(
      'create trigger audit_%1$s after insert or update or delete on public.%1$I
         for each row execute function private.audit_trigger()', t);
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- updated_at trigger on every table that has the column.
-- NOTE: tables added in later migrations must create this trigger themselves.
-- ----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.table_name
      from information_schema.columns c
      join information_schema.tables t
        on t.table_schema = c.table_schema and t.table_name = c.table_name
     where c.table_schema = 'public'
       and c.column_name  = 'updated_at'
       and t.table_type   = 'BASE TABLE'
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', r.table_name);
  end loop;
end;
$$;
