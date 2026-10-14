-- Paste into Dashboard -> SQL Editor and Run. Applies migration 20261014000015 (profile edit rights).
begin;
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

insert into supabase_migrations.schema_migrations (version, name) values ('20261014000015', 'profile_edit_rights') on conflict do nothing;
commit;
