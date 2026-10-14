-- Paste into Dashboard -> SQL Editor. Applies migration 20261014000013.
begin;
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

insert into supabase_migrations.schema_migrations (version, name) values ('20261014000013', 'invite_only_profiles') on conflict do nothing;
commit;
