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
