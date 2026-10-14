-- =============================================================================
-- Create the XenoCare schema (all migrations + seed) in one transaction.
-- For an EMPTY database only. Generated from supabase/migrations/*.sql and
-- supabase/seed.sql. Do not edit by hand.
-- =============================================================================
begin;

-- >>> 20261012000001_extensions_enums.sql
-- =============================================================================
-- XenoCare / vSchool : extensions, schemas, enums, shared functions
-- =============================================================================

create extension if not exists btree_gist with schema extensions;  -- exclusion constraints (no double booking)
create extension if not exists citext     with schema extensions;  -- case-insensitive emails
create extension if not exists pg_trgm    with schema extensions;  -- fuzzy name search

-- Internal helpers (RLS helpers, audit trigger). Not exposed through the API.
create schema if not exists private;
grant usage on schema private to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type public.app_role           as enum ('owner', 'admin', 'therapist');
create type public.therapy_type       as enum ('speech', 'ot', 'physio', 'other');
create type public.gender             as enum ('male', 'female', 'other', 'unspecified');
create type public.student_status     as enum ('active', 'on_hold', 'discharged', 'waitlist');
create type public.appointment_status as enum ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled');
create type public.attendance_status  as enum ('present', 'absent', 'late', 'excused');
create type public.note_format        as enum ('soap', 'smart');
create type public.form_kind          as enum ('assessment', 'soap', 'smart', 'progress_report');
create type public.record_status      as enum ('draft', 'final');
create type public.plan_status        as enum ('active', 'completed', 'on_hold', 'discontinued');
create type public.goal_status        as enum ('active', 'achieved', 'discontinued', 'on_hold');
create type public.leave_status       as enum ('pending', 'approved', 'rejected', 'cancelled');
create type public.billing_unit       as enum ('per_session', 'monthly', 'package');
create type public.invoice_status     as enum ('unpaid', 'partial', 'paid', 'void');
create type public.payment_method     as enum ('cash', 'upi', 'bank_transfer', 'card', 'cheque', 'online', 'other');
create type public.message_purpose    as enum ('appointment_reminder', 'appointment_change', 'payment_reminder', 'absence_notice', 'report_ready', 'general');
create type public.msg_status         as enum ('queued', 'sent', 'delivered', 'read', 'failed');

-- ----------------------------------------------------------------------------
-- updated_at trigger function (attached to every table in a later migration)
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- >>> 20261012000002_org_branches_auth.sql
-- =============================================================================
-- Organization, branches, users (profiles), roles & permissions
-- =============================================================================

-- Single-row table: the organization itself.
create table public.organization_settings (
  id                            boolean primary key default true check (id),  -- enforces one row
  name                          text not null,
  legal_name                    text,
  logo_url                      text,
  email                         extensions.citext,
  phone                         text,
  website                       text,
  address                       text,
  currency                      char(3) not null,
  default_timezone              text not null,
  whatsapp_phone_number_id      text,   -- WhatsApp Cloud API ids only; tokens stay in Express env
  whatsapp_business_account_id  text,
  settings                      jsonb not null default '{}'::jsonb,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

create table public.branches (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique check (code ~ '^[A-Z0-9]{2,10}$'),  -- used in invoice numbers
  name           text not null,
  address        text,
  city           text,
  phone          text,
  email          extensions.citext,
  timezone       text not null default 'UTC',
  opening_hours  jsonb not null default '{}'::jsonb,  -- {"mon":[["08:00","17:00"]], ...}
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create table public.branch_holidays (
  id            uuid primary key default gen_random_uuid(),
  branch_id     uuid not null references public.branches(id) on delete cascade,
  holiday_date  date not null,
  reason        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (branch_id, holiday_date)
);

create table public.rooms (
  id            uuid primary key default gen_random_uuid(),
  branch_id     uuid not null references public.branches(id) on delete cascade,
  name          text not null,
  therapy_type  public.therapy_type,
  capacity      smallint not null default 1,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (branch_id, name)
);
create index rooms_branch_id_idx on public.rooms (branch_id);

-- ----------------------------------------------------------------------------
-- Profiles: one row per Supabase Auth user (owner / admin / therapist).
-- Parents are NOT users; they live in public.parents.
-- ----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  email       extensions.citext,
  phone       text,
  avatar_url  text,
  role        public.app_role not null default 'therapist',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index profiles_role_idx on public.profiles (role);

-- Users can edit only their own basic fields. Role / is_active are changed by
-- Express (service role) so a user can never promote themselves.
revoke update on public.profiles from authenticated, anon;
grant  update (full_name, phone, avatar_url) on public.profiles to authenticated;

-- Create a profile automatically when Express creates an auth user.
-- Role comes from app_metadata (server-controlled), never user_metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.phone,
    coalesce((new.raw_app_meta_data ->> 'role')::public.app_role, 'therapist')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Staff <-> branch membership (a staff member can work at many branches).
create table public.staff_branches (
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  branch_id   uuid not null references public.branches(id) on delete cascade,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now(),
  primary key (profile_id, branch_id)
);
create index staff_branches_branch_id_idx on public.staff_branches (branch_id);
create unique index staff_branches_one_primary_idx on public.staff_branches (profile_id) where is_primary;

-- ----------------------------------------------------------------------------
-- Fine-grained permissions (UI + Express checks; RLS uses roles/branches)
-- ----------------------------------------------------------------------------
create table public.permissions (
  key          text primary key,           -- e.g. 'billing.manage'
  module       text not null,
  description  text
);

create table public.role_permissions (
  role            public.app_role not null,
  permission_key  text not null references public.permissions(key) on delete cascade,
  primary key (role, permission_key)
);

create table public.user_permission_overrides (
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  permission_key  text not null references public.permissions(key) on delete cascade,
  granted         boolean not null,
  created_at      timestamptz not null default now(),
  primary key (profile_id, permission_key)
);

-- >>> 20261012000003_staff.sql
-- =============================================================================
-- Staff / therapists
-- =============================================================================

create table public.staff_details (
  profile_id         uuid primary key references public.profiles(id) on delete cascade,
  employee_code      text unique,
  designation        text,                              -- e.g. 'Senior Speech Therapist'
  therapy_types      public.therapy_type[] not null default '{}',
  qualifications     text,
  license_no         text,
  license_expiry     date,
  join_date          date,
  employment_type    text check (employment_type in ('full_time', 'part_time', 'contract', 'visiting')),
  date_of_birth      date,
  gender             public.gender,
  address            text,
  emergency_contact  jsonb,                             -- {"name":..,"phone":..,"relation":..}
  calendar_color     text,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Weekly working slots per branch. Must be a branch the staff member belongs to.
create table public.therapist_availability (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null,
  branch_id       uuid not null,
  weekday         smallint not null check (weekday between 0 and 6),  -- 0 = Sunday
  start_time      time not null,
  end_time        time not null,
  effective_from  date not null default current_date,
  effective_to    date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (end_time > start_time),
  check (effective_to is null or effective_to >= effective_from),
  foreign key (profile_id, branch_id)
    references public.staff_branches (profile_id, branch_id) on delete cascade
);
create index therapist_availability_branch_idx on public.therapist_availability (branch_id, weekday);
create index therapist_availability_profile_idx on public.therapist_availability (profile_id);

create table public.staff_leaves (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  from_date    date not null,
  to_date      date not null,
  leave_type   text not null default 'annual',          -- annual / sick / casual / other
  reason       text,
  status       public.leave_status not null default 'pending',
  reviewed_by  uuid references public.profiles(id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (to_date >= from_date)
);
create index staff_leaves_profile_idx on public.staff_leaves (profile_id, from_date);
create index staff_leaves_reviewed_by_idx on public.staff_leaves (reviewed_by);

create table public.staff_attendance (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  branch_id   uuid not null references public.branches(id) on delete cascade,
  work_date   date not null,
  check_in    timestamptz,
  check_out   timestamptz,
  status      public.attendance_status not null default 'present',
  notes       text,
  marked_by   uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (profile_id, branch_id, work_date),
  check (check_out is null or check_in is null or check_out >= check_in)
);
create index staff_attendance_branch_date_idx on public.staff_attendance (branch_id, work_date);
create index staff_attendance_marked_by_idx on public.staff_attendance (marked_by);

-- >>> 20261012000004_students_parents.sql
-- =============================================================================
-- Students / patients, parents (contacts only, no login), care team
-- =============================================================================

create sequence public.student_code_seq;

create table public.students (
  id                uuid primary key default gen_random_uuid(),
  home_branch_id    uuid not null references public.branches(id) on delete restrict,
  student_code      text not null unique
                      default ('STU' || lpad(nextval('public.student_code_seq')::text, 6, '0')),
  first_name        text not null,
  last_name         text,
  preferred_name    text,
  date_of_birth     date,
  gender            public.gender not null default 'unspecified',
  photo_path        text,                       -- Storage: student-documents/{student_id}/photo.*
  diagnosis         text[] not null default '{}',  -- e.g. {'ASD','Speech delay'}
  medical_history   text,
  allergies         text,
  medications       text,
  school_name       text,
  grade             text,
  referral_source   text,
  referred_by       text,
  status            public.student_status not null default 'active',
  intake_date       date not null default current_date,
  discharge_date    date,
  discharge_reason  text,
  notes             text,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index students_home_branch_idx on public.students (home_branch_id, status);
create index students_created_by_idx  on public.students (created_by);
create index students_name_trgm_idx   on public.students
  using gin ((first_name || ' ' || coalesce(last_name, '')) extensions.gin_trgm_ops);

create table public.parents (
  id                  uuid primary key default gen_random_uuid(),
  full_name           text not null,
  phone               text,
  whatsapp_number     text check (whatsapp_number ~ '^\+[1-9][0-9]{6,14}$'),  -- E.164
  email               extensions.citext,
  national_id         text,
  address             text,
  occupation          text,
  whatsapp_opt_in     boolean not null default true,
  opt_in_at           timestamptz,
  preferred_language  text not null default 'en',
  notes               text,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);
create index parents_whatsapp_idx   on public.parents (whatsapp_number);
create index parents_created_by_idx on public.parents (created_by);

-- Many-to-many: one parent can have several children (siblings).
create table public.student_parents (
  student_id          uuid not null references public.students(id) on delete cascade,
  parent_id           uuid not null references public.parents(id) on delete cascade,
  relationship        text not null,              -- mother / father / guardian ...
  is_primary_contact  boolean not null default false,
  receives_whatsapp   boolean not null default true,
  created_at          timestamptz not null default now(),
  primary key (student_id, parent_id)
);
create index student_parents_parent_idx on public.student_parents (parent_id);
create unique index student_parents_one_primary_idx
  on public.student_parents (student_id) where is_primary_contact;

-- Care team: which therapist treats which student (drives therapist access).
create table public.student_therapists (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.students(id) on delete cascade,
  therapist_id  uuid not null references public.profiles(id) on delete cascade,
  branch_id     uuid not null references public.branches(id) on delete cascade,
  therapy_type  public.therapy_type not null,
  start_date    date not null default current_date,
  end_date      date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);
create unique index student_therapists_active_uniq
  on public.student_therapists (student_id, therapist_id, therapy_type) where end_date is null;
create index student_therapists_therapist_idx on public.student_therapists (therapist_id);
create index student_therapists_branch_idx    on public.student_therapists (branch_id);

create table public.student_documents (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.students(id) on delete cascade,
  file_path    text not null unique,   -- Storage path: student-documents/{student_id}/...
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint,
  doc_type     text,                   -- medical_report / referral / consent / other
  description  text,
  uploaded_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index student_documents_student_idx  on public.student_documents (student_id);
create index student_documents_uploader_idx on public.student_documents (uploaded_by);

-- >>> 20261012000005_clinical_templates.sql
-- =============================================================================
-- Form templates, assessments, treatment plans, SMART goals
-- =============================================================================

-- Admin-defined forms. `schema` describes sections/fields; React renders it.
-- Never edit a template that has been used: insert a new version instead.
create table public.form_templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  kind          public.form_kind not null,
  therapy_type  public.therapy_type,          -- null = usable for all therapy types
  version       integer not null default 1,
  schema        jsonb not null,
  is_active     boolean not null default true,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (name, version)
);
create index form_templates_kind_idx on public.form_templates (kind, therapy_type) where is_active;
create index form_templates_created_by_idx on public.form_templates (created_by);

create table public.assessments (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.students(id) on delete cascade,
  branch_id         uuid not null references public.branches(id) on delete restrict,
  therapist_id      uuid not null references public.profiles(id) on delete restrict,
  template_id       uuid not null references public.form_templates(id) on delete restrict,
  template_version  integer not null,
  therapy_type      public.therapy_type not null,
  assessment_date   date not null default current_date,
  responses         jsonb not null default '{}'::jsonb,
  scores            jsonb,
  summary           text,
  recommendations   text,
  status            public.record_status not null default 'draft',
  finalized_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index assessments_student_idx   on public.assessments (student_id, assessment_date desc);
create index assessments_branch_idx    on public.assessments (branch_id, assessment_date);
create index assessments_therapist_idx on public.assessments (therapist_id);
create index assessments_template_idx  on public.assessments (template_id);

create table public.treatment_plans (
  id                   uuid primary key default gen_random_uuid(),
  student_id           uuid not null references public.students(id) on delete cascade,
  branch_id            uuid not null references public.branches(id) on delete restrict,
  therapist_id         uuid not null references public.profiles(id) on delete restrict,
  assessment_id        uuid references public.assessments(id) on delete set null,
  therapy_type         public.therapy_type not null,
  title                text not null,
  long_term_objective  text,
  start_date           date not null default current_date,
  review_date          date,
  end_date             date,
  status               public.plan_status not null default 'active',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index treatment_plans_student_idx    on public.treatment_plans (student_id, status);
create index treatment_plans_branch_idx     on public.treatment_plans (branch_id);
create index treatment_plans_therapist_idx  on public.treatment_plans (therapist_id);
create index treatment_plans_assessment_idx on public.treatment_plans (assessment_id);

-- SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound)
create table public.therapy_goals (
  id                   uuid primary key default gen_random_uuid(),
  plan_id              uuid not null references public.treatment_plans(id) on delete cascade,
  domain               text,                    -- e.g. 'Receptive language', 'Fine motor'
  description          text not null,
  specific             text,
  measurable_criteria  text,                    -- e.g. '80% accuracy over 3 sessions'
  achievable_notes     text,
  relevance            text,
  target_date          date,
  baseline_value       numeric,
  target_value         numeric,
  unit                 text,                    -- '%', 'trials', 'seconds' ...
  status               public.goal_status not null default 'active',
  achieved_at          date,
  sort_order           integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index therapy_goals_plan_idx on public.therapy_goals (plan_id, sort_order);

-- >>> 20261012000006_scheduling_sessions.sql
-- =============================================================================
-- Scheduling, therapy session records (SOAP / SMART notes), attendance
-- =============================================================================

-- A recurring rule (e.g. Mon + Wed 10:00 for 3 months). Express expands it
-- into individual rows in public.appointments.
create table public.recurrence_groups (
  id            uuid primary key default gen_random_uuid(),
  branch_id     uuid not null references public.branches(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  therapist_id  uuid not null references public.profiles(id) on delete cascade,
  therapy_type  public.therapy_type not null,
  weekdays      smallint[] not null,            -- 0 = Sunday
  start_time    time not null,
  duration_min  integer not null check (duration_min > 0),
  start_date    date not null,
  end_date      date not null,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (end_date >= start_date)
);
create index recurrence_groups_branch_idx    on public.recurrence_groups (branch_id);
create index recurrence_groups_student_idx   on public.recurrence_groups (student_id);
create index recurrence_groups_therapist_idx on public.recurrence_groups (therapist_id);
create index recurrence_groups_created_by_idx on public.recurrence_groups (created_by);

-- Individual (1 therapist : 1 student) appointments.
create table public.appointments (
  id                   uuid primary key default gen_random_uuid(),
  branch_id            uuid not null references public.branches(id) on delete restrict,
  student_id           uuid not null references public.students(id) on delete cascade,
  therapist_id         uuid not null references public.profiles(id) on delete restrict,
  room_id              uuid references public.rooms(id) on delete set null,
  therapy_type         public.therapy_type not null,
  start_at             timestamptz not null,
  end_at               timestamptz not null,
  status               public.appointment_status not null default 'scheduled',
  recurrence_group_id  uuid references public.recurrence_groups(id) on delete set null,
  rescheduled_from_id  uuid references public.appointments(id) on delete set null,
  cancel_reason        text,
  cancelled_by         uuid references public.profiles(id) on delete set null,
  cancelled_at         timestamptz,
  notes                text,
  reminder_sent_at     timestamptz,
  created_by           uuid references public.profiles(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (end_at > start_at),

  -- No double booking of a therapist, a student, or a room.
  constraint appointments_no_therapist_overlap exclude using gist (
    therapist_id with =, tstzrange(start_at, end_at, '[)') with &&
  ) where (status in ('scheduled', 'confirmed', 'completed')),
  constraint appointments_no_student_overlap exclude using gist (
    student_id with =, tstzrange(start_at, end_at, '[)') with &&
  ) where (status in ('scheduled', 'confirmed', 'completed')),
  constraint appointments_no_room_overlap exclude using gist (
    room_id with =, tstzrange(start_at, end_at, '[)') with &&
  ) where (room_id is not null and status in ('scheduled', 'confirmed', 'completed'))
);
create index appointments_branch_start_idx    on public.appointments (branch_id, start_at);
create index appointments_therapist_start_idx on public.appointments (therapist_id, start_at);
create index appointments_student_start_idx   on public.appointments (student_id, start_at);
create index appointments_room_idx            on public.appointments (room_id);
create index appointments_recurrence_idx      on public.appointments (recurrence_group_id);
create index appointments_rescheduled_idx     on public.appointments (rescheduled_from_id);
create index appointments_cancelled_by_idx    on public.appointments (cancelled_by);
create index appointments_created_by_idx      on public.appointments (created_by);

-- Clinical record of a delivered session. `notes` follows the template:
--   SOAP : {"subjective":..,"objective":..,"assessment":..,"plan":..}
--   SMART: {"goals":[{"goal_id":..,"result":..,"comment":..}], ...}
create table public.therapy_sessions (
  id                 uuid primary key default gen_random_uuid(),
  appointment_id     uuid unique references public.appointments(id) on delete set null,
  student_id         uuid not null references public.students(id) on delete cascade,
  therapist_id       uuid not null references public.profiles(id) on delete restrict,
  branch_id          uuid not null references public.branches(id) on delete restrict,
  plan_id            uuid references public.treatment_plans(id) on delete set null,
  therapy_type       public.therapy_type not null,
  session_date       date not null,
  start_at           timestamptz,
  duration_min       integer check (duration_min > 0),
  note_format        public.note_format not null default 'soap',
  template_id        uuid references public.form_templates(id) on delete restrict,
  notes              jsonb not null default '{}'::jsonb,
  activities         text,
  home_program       text,         -- home exercises; can be shared with parents via WhatsApp
  parent_feedback    text,
  next_session_plan  text,
  is_locked          boolean not null default false,   -- locked after therapist signs off
  signed_at          timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index therapy_sessions_student_idx   on public.therapy_sessions (student_id, session_date desc);
create index therapy_sessions_branch_idx    on public.therapy_sessions (branch_id, session_date);
create index therapy_sessions_therapist_idx on public.therapy_sessions (therapist_id, session_date);
create index therapy_sessions_plan_idx      on public.therapy_sessions (plan_id);
create index therapy_sessions_template_idx  on public.therapy_sessions (template_id);

-- Signed notes can only be changed by the owner (or the service role).
create or replace function public.guard_locked_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_locked
     and auth.uid() is not null
     and not exists (select 1 from public.profiles where id = auth.uid() and role = 'owner') then
    raise exception 'This session note is signed and locked; only the owner can change it';
  end if;
  if new.is_locked and not old.is_locked then
    new.signed_at := coalesce(new.signed_at, now());
  end if;
  return new;
end;
$$;

create trigger therapy_sessions_guard_locked
  before update on public.therapy_sessions
  for each row execute function public.guard_locked_session();

-- Measured goal progress per session (feeds progress charts).
create table public.goal_progress (
  id            uuid primary key default gen_random_uuid(),
  goal_id       uuid not null references public.therapy_goals(id) on delete cascade,
  session_id    uuid references public.therapy_sessions(id) on delete set null,
  value         numeric,
  trials        integer check (trials >= 0),
  successes     integer check (successes >= 0),
  prompt_level  text,            -- independent / verbal / gestural / physical ...
  note          text,
  recorded_by   uuid references public.profiles(id) on delete set null,
  recorded_at   timestamptz not null default now(),
  check (successes is null or trials is null or successes <= trials)
);
create index goal_progress_goal_idx     on public.goal_progress (goal_id, recorded_at);
create index goal_progress_session_idx  on public.goal_progress (session_id);
create index goal_progress_recorder_idx on public.goal_progress (recorded_by);

-- Student attendance per appointment (absences are recorded even with no session).
create table public.student_attendance (
  id               uuid primary key default gen_random_uuid(),
  appointment_id   uuid not null unique references public.appointments(id) on delete cascade,
  student_id       uuid not null references public.students(id) on delete cascade,
  branch_id        uuid not null references public.branches(id) on delete restrict,
  attendance_date  date not null,
  status           public.attendance_status not null,
  arrived_at       timestamptz,
  notes            text,
  marked_by        uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index student_attendance_branch_date_idx on public.student_attendance (branch_id, attendance_date);
create index student_attendance_student_idx     on public.student_attendance (student_id, attendance_date);
create index student_attendance_marked_by_idx   on public.student_attendance (marked_by);

-- >>> 20261012000007_billing.sql
-- =============================================================================
-- Billing: manual fee & payment records only (no online payment gateway).
-- Admins record payments; reminders go to parents via WhatsApp; the owner
-- dashboard reads branch revenue from public.payments.
-- =============================================================================

create table public.fee_plans (
  id              uuid primary key default gen_random_uuid(),
  branch_id       uuid not null references public.branches(id) on delete cascade,
  name            text not null,
  therapy_type    public.therapy_type,
  billing_unit    public.billing_unit not null,
  amount          numeric(12,2) not null check (amount >= 0),
  sessions_count  integer check (sessions_count > 0),   -- for packages
  validity_days   integer check (validity_days > 0),    -- for packages
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (branch_id, name),
  check (billing_unit <> 'package' or sessions_count is not null)
);

create table public.student_fee_assignments (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.students(id) on delete cascade,
  branch_id         uuid not null references public.branches(id) on delete cascade,
  fee_plan_id       uuid not null references public.fee_plans(id) on delete restrict,
  custom_amount     numeric(12,2) check (custom_amount >= 0),
  discount_percent  numeric(5,2) not null default 0 check (discount_percent between 0 and 100),
  start_date        date not null default current_date,
  end_date          date,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);
create index student_fee_assignments_student_idx on public.student_fee_assignments (student_id);
create index student_fee_assignments_branch_idx  on public.student_fee_assignments (branch_id);
create index student_fee_assignments_plan_idx    on public.student_fee_assignments (fee_plan_id);

-- Per-branch, per-year invoice counter (e.g. GDV-2026-00042).
create table public.invoice_counters (
  branch_id  uuid not null references public.branches(id) on delete cascade,
  year       integer not null,
  last_no    integer not null,
  primary key (branch_id, year)
);

create table public.invoices (
  id                uuid primary key default gen_random_uuid(),
  branch_id         uuid not null references public.branches(id) on delete restrict,
  student_id        uuid not null references public.students(id) on delete restrict,
  invoice_no        text not null,
  issue_date        date not null default current_date,
  due_date          date,
  period_start      date,
  period_end        date,
  subtotal          numeric(12,2) not null default 0,   -- maintained from invoice_items
  discount          numeric(12,2) not null default 0 check (discount >= 0),
  total             numeric(12,2) generated always as (subtotal - discount) stored,
  amount_paid       numeric(12,2) not null default 0,   -- maintained from payments
  balance           numeric(12,2) generated always as (subtotal - discount - amount_paid) stored,
  status            public.invoice_status not null default 'unpaid',
  notes             text,
  last_reminder_at  timestamptz,
  reminder_count    integer not null default 0,
  voided_at         timestamptz,
  void_reason       text,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (branch_id, invoice_no)
);
create index invoices_branch_status_idx on public.invoices (branch_id, status, due_date);
create index invoices_student_idx       on public.invoices (student_id, issue_date desc);
create index invoices_created_by_idx    on public.invoices (created_by);

create or replace function public.assign_invoice_no()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year int := extract(year from new.issue_date)::int;
  v_no   int;
  v_code text;
begin
  if new.invoice_no is not null then
    return new;
  end if;

  insert into public.invoice_counters (branch_id, year, last_no)
  values (new.branch_id, v_year, 1)
  on conflict (branch_id, year)
    do update set last_no = public.invoice_counters.last_no + 1
  returning last_no into v_no;

  select code into v_code from public.branches where id = new.branch_id;
  new.invoice_no := v_code || '-' || v_year || '-' || lpad(v_no::text, 5, '0');
  return new;
end;
$$;

create trigger invoices_assign_no
  before insert on public.invoices
  for each row execute function public.assign_invoice_no();

create table public.invoice_items (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references public.invoices(id) on delete cascade,
  description  text not null,
  session_id   uuid references public.therapy_sessions(id) on delete set null,
  fee_plan_id  uuid references public.fee_plans(id) on delete set null,
  quantity     numeric(10,2) not null default 1 check (quantity > 0),
  unit_price   numeric(12,2) not null check (unit_price >= 0),
  amount       numeric(12,2) generated always as (quantity * unit_price) stored,
  created_at   timestamptz not null default now()
);
create index invoice_items_invoice_idx  on public.invoice_items (invoice_id);
create index invoice_items_session_idx  on public.invoice_items (session_id);
create index invoice_items_fee_plan_idx on public.invoice_items (fee_plan_id);

create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  invoice_id    uuid not null references public.invoices(id) on delete restrict,
  branch_id     uuid not null references public.branches(id) on delete restrict,   -- copied from invoice
  student_id    uuid not null references public.students(id) on delete restrict,   -- copied from invoice
  amount        numeric(12,2) not null check (amount > 0),
  method        public.payment_method not null default 'cash',
  paid_at       timestamptz not null default now(),
  reference_no  text,
  notes         text,
  received_by   uuid references public.profiles(id) on delete set null,
  is_void       boolean not null default false,
  voided_at     timestamptz,
  void_reason   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index payments_branch_paid_idx on public.payments (branch_id, paid_at) where not is_void;
create index payments_invoice_idx     on public.payments (invoice_id);
create index payments_student_idx     on public.payments (student_id);
create index payments_received_by_idx on public.payments (received_by);

-- Payment always inherits branch/student from its invoice.
create or replace function public.payment_fill_from_invoice()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select i.branch_id, i.student_id
    into new.branch_id, new.student_id
    from public.invoices i
   where i.id = new.invoice_id;
  return new;
end;
$$;

create trigger payments_fill_from_invoice
  before insert or update of invoice_id on public.payments
  for each row execute function public.payment_fill_from_invoice();

-- Recompute subtotal, amount_paid and status of one invoice.
create or replace function public.refresh_invoice(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.invoices i
     set subtotal    = coalesce((select sum(ii.amount) from public.invoice_items ii where ii.invoice_id = i.id), 0),
         amount_paid = coalesce((select sum(p.amount) from public.payments p where p.invoice_id = i.id and not p.is_void), 0)
   where i.id = p_invoice_id;

  update public.invoices i
     set status = case
                    when i.status = 'void'                       then 'void'::public.invoice_status
                    when i.total > 0 and i.amount_paid >= i.total then 'paid'::public.invoice_status
                    when i.amount_paid > 0                        then 'partial'::public.invoice_status
                    else 'unpaid'::public.invoice_status
                  end
   where i.id = p_invoice_id;
end;
$$;
revoke execute on function public.refresh_invoice(uuid) from public, anon, authenticated;

create or replace function public.on_invoice_child_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_invoice(old.invoice_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_invoice(new.invoice_id);
  end if;
  return null;
end;
$$;

create trigger invoice_items_refresh
  after insert or update or delete on public.invoice_items
  for each row execute function public.on_invoice_child_change();

create trigger payments_refresh
  after insert or update or delete on public.payments
  for each row execute function public.on_invoice_child_change();

-- Recalculate totals/status when the discount changes.
-- (To void: set status = 'void'. To un-void: set status = 'unpaid' then call
--  refresh_invoice() from Express.)
create or replace function public.on_invoice_amounts_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_invoice(new.id);
  return null;
end;
$$;

create trigger invoices_refresh_on_discount
  after update of discount on public.invoices
  for each row
  when (old.discount is distinct from new.discount)
  execute function public.on_invoice_amounts_change();

-- >>> 20261012000008_whatsapp.sql
-- =============================================================================
-- WhatsApp messaging (parents have no login; all contact is via WhatsApp API).
-- Express (service role) sends messages and updates status from the webhook.
-- =============================================================================

create table public.message_templates (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null unique,
  purpose                 public.message_purpose not null,
  provider_template_name  text not null,      -- approved template name in WhatsApp Business
  language                text not null default 'en',
  body_preview            text,               -- text shown in the admin UI
  variables               jsonb not null default '[]'::jsonb,  -- ["parent_name","student_name","date"]
  is_active               boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table public.whatsapp_messages (
  id                   uuid primary key default gen_random_uuid(),
  branch_id            uuid not null references public.branches(id) on delete restrict,
  parent_id            uuid references public.parents(id) on delete set null,
  student_id           uuid references public.students(id) on delete set null,
  to_number            text not null,
  template_id          uuid references public.message_templates(id) on delete set null,
  purpose              public.message_purpose not null,
  related_type         text check (related_type in ('appointment', 'invoice', 'progress_report', 'attendance', 'other')),
  related_id           uuid,
  payload              jsonb not null default '{}'::jsonb,   -- variables actually sent
  status               public.msg_status not null default 'queued',
  provider_message_id  text unique,
  error_message        text,
  sent_by              uuid references public.profiles(id) on delete set null,   -- null = automatic
  queued_at            timestamptz not null default now(),
  sent_at              timestamptz,
  delivered_at         timestamptz,
  read_at              timestamptz,
  failed_at            timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index whatsapp_messages_branch_idx   on public.whatsapp_messages (branch_id, queued_at desc);
create index whatsapp_messages_status_idx   on public.whatsapp_messages (status) where status in ('queued', 'failed');
create index whatsapp_messages_related_idx  on public.whatsapp_messages (related_type, related_id);
create index whatsapp_messages_parent_idx   on public.whatsapp_messages (parent_id);
create index whatsapp_messages_student_idx  on public.whatsapp_messages (student_id);
create index whatsapp_messages_template_idx on public.whatsapp_messages (template_id);
create index whatsapp_messages_sent_by_idx  on public.whatsapp_messages (sent_by);

-- Automatic reminder rules, run by a cron job in Express.
-- offset_minutes: negative = before the event (appointment start / invoice due date).
create table public.notification_schedules (
  id              uuid primary key default gen_random_uuid(),
  branch_id       uuid references public.branches(id) on delete cascade,   -- null = all branches
  purpose         public.message_purpose not null,
  template_id     uuid not null references public.message_templates(id) on delete cascade,
  offset_minutes  integer not null,
  repeat_every_days integer check (repeat_every_days > 0),               -- e.g. overdue reminders
  max_repeats     integer check (max_repeats > 0),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index notification_schedules_branch_idx   on public.notification_schedules (branch_id);
create index notification_schedules_template_idx on public.notification_schedules (template_id);

-- >>> 20261012000009_reports_audit_triggers.sql
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

-- >>> 20261012000010_rls_helpers_policies.sql
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

-- >>> 20261012000011_views_dashboard.sql
-- =============================================================================
-- Dashboard views. security_invoker = true => the caller's RLS applies, so an
-- admin sees only their branches and therapists see no revenue.
-- =============================================================================

-- Owner dashboard: revenue per branch per month (recorded payments).
create view public.v_branch_revenue_monthly
with (security_invoker = true) as
select
  p.branch_id,
  b.name                                  as branch_name,
  date_trunc('month', p.paid_at)::date    as month,
  sum(p.amount)                           as revenue,
  count(*)                                as payments_count,
  count(distinct p.student_id)            as paying_students
from public.payments p
join public.branches b on b.id = p.branch_id
where not p.is_void
group by p.branch_id, b.name, date_trunc('month', p.paid_at);

-- Outstanding dues + primary parent's WhatsApp number (for reminders).
create view public.v_outstanding_dues
with (security_invoker = true) as
select
  i.id                                    as invoice_id,
  i.invoice_no,
  i.branch_id,
  b.name                                  as branch_name,
  i.student_id,
  s.student_code,
  trim(s.first_name || ' ' || coalesce(s.last_name, '')) as student_name,
  i.issue_date,
  i.due_date,
  i.total,
  i.amount_paid,
  i.balance,
  i.status,
  greatest(current_date - i.due_date, 0)  as days_overdue,
  i.last_reminder_at,
  i.reminder_count,
  par.id                                  as parent_id,
  par.full_name                           as parent_name,
  par.whatsapp_number,
  par.whatsapp_opt_in
from public.invoices i
join public.branches b on b.id = i.branch_id
join public.students s on s.id = i.student_id
left join public.student_parents sp on sp.student_id = s.id and sp.is_primary_contact
left join public.parents par on par.id = sp.parent_id
where i.status in ('unpaid', 'partial')
  and i.balance > 0;

-- Branch-level dues totals for the owner dashboard.
create view public.v_branch_dues_summary
with (security_invoker = true) as
select
  i.branch_id,
  b.name                                                    as branch_name,
  count(*)                                                  as open_invoices,
  sum(i.balance)                                            as total_outstanding,
  sum(i.balance) filter (where i.due_date < current_date)   as overdue_amount
from public.invoices i
join public.branches b on b.id = i.branch_id
where i.status in ('unpaid', 'partial')
group by i.branch_id, b.name;

-- Therapist workload per month.
create view public.v_therapist_utilization
with (security_invoker = true) as
select
  a.therapist_id,
  pr.full_name                                                      as therapist_name,
  a.branch_id,
  date_trunc('month', a.start_at)::date                             as month,
  count(*)                                                          as total_appointments,
  count(*) filter (where a.status = 'completed')                    as completed,
  count(*) filter (where a.status = 'cancelled')                    as cancelled,
  count(*) filter (where a.status = 'no_show')                      as no_show,
  round(sum(extract(epoch from (a.end_at - a.start_at)) / 3600.0)
        filter (where a.status = 'completed'), 2)                   as completed_hours
from public.appointments a
join public.profiles pr on pr.id = a.therapist_id
group by a.therapist_id, pr.full_name, a.branch_id, date_trunc('month', a.start_at);

-- Student attendance per month.
create view public.v_attendance_summary
with (security_invoker = true) as
select
  sa.student_id,
  sa.branch_id,
  date_trunc('month', sa.attendance_date)::date        as month,
  count(*)                                             as total,
  count(*) filter (where sa.status = 'present')        as present,
  count(*) filter (where sa.status = 'late')           as late,
  count(*) filter (where sa.status = 'absent')         as absent,
  count(*) filter (where sa.status = 'excused')        as excused,
  round(100.0 * count(*) filter (where sa.status in ('present', 'late')) / nullif(count(*), 0), 1)
                                                       as attendance_pct
from public.student_attendance sa
group by sa.student_id, sa.branch_id, date_trunc('month', sa.attendance_date);

-- Student counts per branch.
create view public.v_students_by_branch
with (security_invoker = true) as
select
  b.id                                                                       as branch_id,
  b.name                                                                     as branch_name,
  count(s.id) filter (where s.status = 'active')                             as active_students,
  count(s.id) filter (where s.status = 'waitlist')                           as waitlist,
  count(s.id) filter (where s.status = 'on_hold')                            as on_hold,
  count(s.id) filter (where s.intake_date >= date_trunc('month', current_date)) as new_this_month
from public.branches b
left join public.students s on s.home_branch_id = b.id and s.deleted_at is null
where b.deleted_at is null
group by b.id, b.name;

-- Views are readable by signed-in users only (RLS still applies underneath).
revoke all on public.v_branch_revenue_monthly, public.v_outstanding_dues, public.v_branch_dues_summary,
              public.v_therapist_utilization, public.v_attendance_summary, public.v_students_by_branch
  from anon;

-- >>> 20261012000012_storage_buckets.sql
-- =============================================================================
-- Storage buckets (all private; files are served through signed URLs)
--   student-documents/{student_id}/...   medical reports, consent forms, photo
--   reports/{student_id}/...             generated progress report PDFs
--   avatars/{profile_id}/...             staff profile pictures
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('student-documents', 'student-documents', false, 20971520,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('reports', 'reports', false, 20971520, array['application/pdf']),
  ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Student files: access follows student access.
create policy "student files: read" on storage.objects for select to authenticated
  using (bucket_id in ('student-documents', 'reports')
         and private.can_view_student(private.try_uuid((storage.foldername(name))[1])));

create policy "student files: upload" on storage.objects for insert to authenticated
  with check (bucket_id in ('student-documents', 'reports')
              and private.can_view_student(private.try_uuid((storage.foldername(name))[1])));

create policy "student files: update" on storage.objects for update to authenticated
  using (bucket_id in ('student-documents', 'reports')
         and private.can_view_student(private.try_uuid((storage.foldername(name))[1])))
  with check (bucket_id in ('student-documents', 'reports')
              and private.can_view_student(private.try_uuid((storage.foldername(name))[1])));

create policy "student files: delete" on storage.objects for delete to authenticated
  using (bucket_id in ('student-documents', 'reports')
         and private.can_manage_student(private.try_uuid((storage.foldername(name))[1])));

-- Avatars: any signed-in staff can view; users manage only their own folder.
create policy "avatars: read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars');

create policy "avatars: own write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: own update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- >>> 20261014000013_invite_only_profiles.sql
-- =============================================================================
-- Invite-only accounts. Staff are created by the owner/admin (Express sets
-- app_metadata.role). Anyone else who reaches auth.users (e.g. a Google sign-in
-- while public sign-ups are accidentally enabled) gets an inactive profile and
-- therefore no access: every RLS helper requires profiles.is_active.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role := (new.raw_app_meta_data ->> 'role')::public.app_role;
begin
  insert into public.profiles (id, email, full_name, phone, role, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.phone,
    coalesce(v_role, 'therapist'),
    v_role is not null
  );
  return new;
end;
$$;

-- >>> 20261014000014_role_workflow.sql
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

-- >>> 20261014000015_profile_edit_rights.sql
-- =============================================================================
-- Who may edit a staff profile (name, phone, photo, designation, therapies):
--   owner     : everyone, including themselves
--   admin     : therapists who share one of their branches (not themselves,
--               not other admins)
--   therapist : nobody (their own profile is read-only)
-- Role / active status / branches still change only through Express.
-- =============================================================================

create or replace function private.can_edit_profile(p_profile_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_owner()
      or (private.user_role() = 'admin'
          and p_profile_id <> auth.uid()
          and exists (select 1 from public.profiles p
                       where p.id = p_profile_id and p.role = 'therapist' and p.deleted_at is null)
          and private.shares_branch(p_profile_id))
$$;
grant execute on function private.can_edit_profile(uuid) to authenticated, service_role;

-- profiles: column grants (migration 0002) still limit edits to full_name / phone / avatar_url.
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (private.can_edit_profile(id)) with check (private.can_edit_profile(id));

-- staff_details (designation, therapies, ...)
drop policy if exists staff_details_write on public.staff_details;
create policy staff_details_write on public.staff_details for all to authenticated
  using (private.can_edit_profile(profile_id)) with check (private.can_edit_profile(profile_id));

-- Profile photos: avatars/{profile_id}/... writable by whoever may edit that profile.
drop policy if exists "avatars: own write" on storage.objects;
drop policy if exists "avatars: own update" on storage.objects;
drop policy if exists "avatars: own delete" on storage.objects;
drop policy if exists "avatars: editor write" on storage.objects;
drop policy if exists "avatars: editor update" on storage.objects;
drop policy if exists "avatars: editor delete" on storage.objects;

create policy "avatars: editor write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and private.can_edit_profile(private.try_uuid((storage.foldername(name))[1])));
create policy "avatars: editor update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and private.can_edit_profile(private.try_uuid((storage.foldername(name))[1])))
  with check (bucket_id = 'avatars' and private.can_edit_profile(private.try_uuid((storage.foldername(name))[1])));
create policy "avatars: editor delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and private.can_edit_profile(private.try_uuid((storage.foldername(name))[1])));

-- >>> seed.sql
-- =============================================================================
-- Seed data: permissions, role defaults, organization, branches,
-- form templates (SOAP / SMART / assessments), WhatsApp templates.
-- Users are NOT seeded: create the owner via Express / Supabase dashboard with
-- app_metadata = {"role":"owner"} (see docs/database.md).
-- =============================================================================

insert into public.organization_settings (name, currency, default_timezone)
values ('XenoCare Therapy Centre', 'INR', 'Asia/Kolkata')
on conflict (id) do nothing;

insert into public.branches (code, name, city, timezone) values
  ('GDV', 'Guduvancherry', 'Chennai', 'Asia/Kolkata'),
  ('VDL', 'Vandalur',      'Chennai', 'Asia/Kolkata'),
  ('SPK', 'SP Koil',       'Chennai', 'Asia/Kolkata'),
  ('KLB', 'Kelambakkam',   'Chennai', 'Asia/Kolkata'),
  ('NGN', 'Nanganallur',   'Chennai', 'Asia/Kolkata')
on conflict (code) do nothing;

-- ----------------------------------------------------------------------------
-- Permissions
-- ----------------------------------------------------------------------------
insert into public.permissions (key, module, description) values
  ('dashboard.owner',     'dashboard',   'Organization-wide dashboard and revenue'),
  ('dashboard.branch',    'dashboard',   'Branch dashboard'),
  ('dashboard.therapist', 'dashboard',   'Personal therapist dashboard'),
  ('settings.manage',     'settings',    'Organization settings'),
  ('branches.manage',     'branches',    'Create and edit branches'),
  ('staff.view',          'staff',       'View staff'),
  ('staff.manage',        'staff',       'Create and edit staff, assign branches'),
  ('leaves.approve',      'staff',       'Approve staff leave'),
  ('students.view',       'students',    'View students'),
  ('students.manage',     'students',    'Register and edit students'),
  ('parents.manage',      'students',    'Manage parents / guardians'),
  ('appointments.view',   'scheduling',  'View appointments'),
  ('appointments.manage', 'scheduling',  'Create, reschedule, cancel appointments'),
  ('attendance.mark',     'scheduling',  'Mark student attendance'),
  ('sessions.write',      'clinical',    'Write session notes (SOAP / SMART)'),
  ('assessments.write',   'clinical',    'Perform assessments'),
  ('plans.write',         'clinical',    'Manage treatment plans and goals'),
  ('templates.manage',    'clinical',    'Manage assessment / note templates'),
  ('reports.view',        'reports',     'View reports'),
  ('reports.write',       'reports',     'Write progress reports'),
  ('billing.view',        'billing',     'View invoices and payments'),
  ('billing.manage',      'billing',     'Create invoices, record payments'),
  ('whatsapp.send',       'messaging',   'Send WhatsApp messages to parents'),
  ('audit.view',          'system',      'View audit logs')
on conflict (key) do nothing;

-- Owner: oversight + branches/admins. Patients, schedules and clinical work belong to branch admins.
insert into public.role_permissions (role, permission_key)
select 'owner'::public.app_role, key from public.permissions
 where key not in ('students.manage', 'parents.manage', 'appointments.manage', 'attendance.mark',
                   'sessions.write', 'assessments.write', 'plans.write', 'reports.write',
                   'billing.manage', 'whatsapp.send')
on conflict do nothing;

insert into public.role_permissions (role, permission_key)
select 'admin'::public.app_role, key from public.permissions
 where key not in ('dashboard.owner', 'settings.manage', 'branches.manage', 'dashboard.therapist')
on conflict do nothing;

insert into public.role_permissions (role, permission_key)
select 'therapist'::public.app_role, key from public.permissions
 where key in ('dashboard.therapist', 'students.view', 'appointments.view', 'attendance.mark',
               'sessions.write', 'assessments.write', 'plans.write', 'reports.view', 'reports.write')
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Form templates. Field types: text, textarea, number, select, multiselect,
-- checkbox, date, scale (min/max), table.
-- ----------------------------------------------------------------------------
insert into public.form_templates (name, kind, therapy_type, version, schema) values
('SOAP Note', 'soap', null, 1, '{
  "sections": [
    {"key": "subjective", "label": "Subjective", "fields": [
      {"key": "parent_report", "label": "Parent / caregiver report", "type": "textarea"},
      {"key": "student_mood", "label": "Mood / behaviour on arrival", "type": "select",
       "options": ["Calm", "Cooperative", "Anxious", "Irritable", "Tired"]}]},
    {"key": "objective", "label": "Objective", "fields": [
      {"key": "observations", "label": "Observations & measurements", "type": "textarea", "required": true}]},
    {"key": "assessment", "label": "Assessment", "fields": [
      {"key": "analysis", "label": "Clinical interpretation / progress", "type": "textarea", "required": true}]},
    {"key": "plan", "label": "Plan", "fields": [
      {"key": "next_steps", "label": "Plan for next session", "type": "textarea"},
      {"key": "home_program", "label": "Home program for parents", "type": "textarea"}]}
  ]}'::jsonb),
('SMART Goal Session Note', 'smart', null, 1, '{
  "sections": [
    {"key": "goals", "label": "Goals worked on", "fields": [
      {"key": "goal_results", "label": "Goal results", "type": "table", "columns": [
        {"key": "goal_id", "label": "Goal", "type": "goal_ref"},
        {"key": "trials", "label": "Trials", "type": "number"},
        {"key": "successes", "label": "Successes", "type": "number"},
        {"key": "prompt_level", "label": "Prompt level", "type": "select",
         "options": ["Independent", "Verbal", "Gestural", "Model", "Physical"]},
        {"key": "comment", "label": "Comment", "type": "text"}]}]},
    {"key": "summary", "label": "Summary", "fields": [
      {"key": "overall", "label": "Overall progress", "type": "textarea"},
      {"key": "home_program", "label": "Home program for parents", "type": "textarea"}]}
  ]}'::jsonb),
('Speech & Language Initial Assessment', 'assessment', 'speech', 1, '{
  "sections": [
    {"key": "history", "label": "Case history", "fields": [
      {"key": "concerns", "label": "Primary concerns", "type": "textarea"},
      {"key": "languages", "label": "Languages spoken at home", "type": "multiselect",
       "options": ["Tamil", "English", "Hindi", "Telugu", "Malayalam", "Other"]},
      {"key": "milestones", "label": "Speech milestones", "type": "textarea"}]},
    {"key": "receptive", "label": "Receptive language", "fields": [
      {"key": "follows_commands", "label": "Follows commands", "type": "select",
       "options": ["None", "1-step", "2-step", "Multi-step"]},
      {"key": "receptive_score", "label": "Receptive rating", "type": "scale", "min": 1, "max": 5}]},
    {"key": "expressive", "label": "Expressive language", "fields": [
      {"key": "mlu", "label": "Mean length of utterance", "type": "number"},
      {"key": "expressive_score", "label": "Expressive rating", "type": "scale", "min": 1, "max": 5}]},
    {"key": "articulation", "label": "Articulation, fluency, voice, oral motor", "fields": [
      {"key": "error_sounds", "label": "Error sounds", "type": "text"},
      {"key": "fluency", "label": "Fluency", "type": "textarea"},
      {"key": "oral_motor", "label": "Oral motor examination", "type": "textarea"}]},
    {"key": "impression", "label": "Impression", "fields": [
      {"key": "diagnosis", "label": "Provisional diagnosis", "type": "textarea"},
      {"key": "recommendation", "label": "Recommendations", "type": "textarea"}]}
  ]}'::jsonb),
('Occupational Therapy Initial Assessment', 'assessment', 'ot', 1, '{
  "sections": [
    {"key": "history", "label": "Background", "fields": [
      {"key": "concerns", "label": "Primary concerns", "type": "textarea"}]},
    {"key": "motor", "label": "Motor skills", "fields": [
      {"key": "fine_motor", "label": "Fine motor", "type": "scale", "min": 1, "max": 5},
      {"key": "gross_motor", "label": "Gross motor", "type": "scale", "min": 1, "max": 5},
      {"key": "grasp", "label": "Grasp pattern", "type": "text"}]},
    {"key": "sensory", "label": "Sensory processing", "fields": [
      {"key": "sensory_profile", "label": "Sensory profile", "type": "multiselect",
       "options": ["Tactile seeking", "Tactile avoiding", "Vestibular seeking", "Auditory sensitive", "Visual sensitive"]},
      {"key": "sensory_notes", "label": "Notes", "type": "textarea"}]},
    {"key": "adl", "label": "Activities of daily living", "fields": [
      {"key": "self_care", "label": "Self-care (feeding, dressing, toileting)", "type": "textarea"}]},
    {"key": "impression", "label": "Impression", "fields": [
      {"key": "summary", "label": "Summary", "type": "textarea"},
      {"key": "recommendation", "label": "Recommendations", "type": "textarea"}]}
  ]}'::jsonb),
('Physiotherapy Initial Assessment', 'assessment', 'physio', 1, '{
  "sections": [
    {"key": "history", "label": "History", "fields": [
      {"key": "complaint", "label": "Chief complaint", "type": "textarea"},
      {"key": "medical", "label": "Relevant medical history", "type": "textarea"}]},
    {"key": "examination", "label": "Examination", "fields": [
      {"key": "posture", "label": "Posture", "type": "textarea"},
      {"key": "tone", "label": "Muscle tone", "type": "select", "options": ["Normal", "Hypotonia", "Hypertonia", "Mixed"]},
      {"key": "rom", "label": "Range of motion", "type": "textarea"},
      {"key": "strength", "label": "Muscle strength", "type": "textarea"},
      {"key": "balance", "label": "Balance & gait", "type": "textarea"},
      {"key": "pain", "label": "Pain score", "type": "scale", "min": 0, "max": 10}]},
    {"key": "impression", "label": "Impression", "fields": [
      {"key": "summary", "label": "Summary", "type": "textarea"},
      {"key": "recommendation", "label": "Recommendations", "type": "textarea"}]}
  ]}'::jsonb),
('Progress Report', 'progress_report', null, 1, '{
  "sections": [
    {"key": "overview", "label": "Overview", "fields": [
      {"key": "attendance", "label": "Attendance summary", "type": "textarea"},
      {"key": "summary", "label": "Progress summary", "type": "textarea", "required": true}]},
    {"key": "goals", "label": "Goal status", "fields": [
      {"key": "goal_status", "label": "Goals", "type": "table", "columns": [
        {"key": "goal_id", "label": "Goal", "type": "goal_ref"},
        {"key": "status", "label": "Status", "type": "select", "options": ["Achieved", "Progressing", "Not yet"]},
        {"key": "comment", "label": "Comment", "type": "text"}]}]},
    {"key": "next", "label": "Recommendations", "fields": [
      {"key": "recommendations", "label": "Recommendations for next period", "type": "textarea"}]}
  ]}'::jsonb)
on conflict (name, version) do nothing;

-- ----------------------------------------------------------------------------
-- WhatsApp templates (provider_template_name must match the names approved
-- in WhatsApp Business Manager) and default reminder rules.
-- ----------------------------------------------------------------------------
insert into public.message_templates (name, purpose, provider_template_name, body_preview, variables) values
  ('Appointment reminder', 'appointment_reminder', 'appointment_reminder',
   'Dear {{parent_name}}, this is a reminder of {{student_name}}''s {{therapy}} session on {{date}} at {{time}} at {{branch}}.',
   '["parent_name","student_name","therapy","date","time","branch"]'),
  ('Appointment changed', 'appointment_change', 'appointment_change',
   'Dear {{parent_name}}, {{student_name}}''s session has been changed to {{date}} at {{time}}.',
   '["parent_name","student_name","date","time"]'),
  ('Payment reminder', 'payment_reminder', 'payment_reminder',
   'Dear {{parent_name}}, invoice {{invoice_no}} for {{student_name}} has a balance of {{amount}} due on {{due_date}}.',
   '["parent_name","student_name","invoice_no","amount","due_date"]'),
  ('Absence notice', 'absence_notice', 'absence_notice',
   'Dear {{parent_name}}, {{student_name}} was marked absent for the session on {{date}}.',
   '["parent_name","student_name","date"]'),
  ('Progress report ready', 'report_ready', 'report_ready',
   'Dear {{parent_name}}, the progress report for {{student_name}} is ready. Please contact {{branch}} to collect it.',
   '["parent_name","student_name","branch"]')
on conflict (name) do nothing;

insert into public.notification_schedules (branch_id, purpose, template_id, offset_minutes, repeat_every_days, max_repeats)
select null::uuid, 'appointment_reminder'::public.message_purpose, id, -1440, null::int, null::int
  from public.message_templates where name = 'Appointment reminder'
union all
select null::uuid, 'payment_reminder'::public.message_purpose, id, 4320, 7, 3        -- 3 days after due date, then weekly x3
  from public.message_templates where name = 'Payment reminder';

-- Record migration history so future 'supabase db push' only applies new files
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
insert into supabase_migrations.schema_migrations (version, name) values
  ('20261012000001', 'extensions_enums'),
  ('20261012000002', 'org_branches_auth'),
  ('20261012000003', 'staff'),
  ('20261012000004', 'students_parents'),
  ('20261012000005', 'clinical_templates'),
  ('20261012000006', 'scheduling_sessions'),
  ('20261012000007', 'billing'),
  ('20261012000008', 'whatsapp'),
  ('20261012000009', 'reports_audit_triggers'),
  ('20261012000010', 'rls_helpers_policies'),
  ('20261012000011', 'views_dashboard'),
  ('20261012000012', 'storage_buckets'),
  ('20261014000013', 'invite_only_profiles'),
  ('20261014000014', 'role_workflow'),
  ('20261014000015', 'profile_edit_rights')
on conflict do nothing;

commit;
