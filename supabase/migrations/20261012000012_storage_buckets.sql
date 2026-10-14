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
