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
