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
