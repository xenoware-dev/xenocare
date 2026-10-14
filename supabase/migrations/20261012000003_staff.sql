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
