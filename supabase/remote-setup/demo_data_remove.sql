-- =============================================================================
-- Removes everything demo_data.sql created: demo children (and their parents,
-- care teams, appointments, attendance, notes, plans, goals, assessments,
-- reports) and the demo staff logins (@demo.example). Real data is not touched.
-- Paste into Dashboard -> SQL Editor and Run.
--
-- If it stops with a foreign-key error, a real record was linked to a demo
-- therapist (e.g. a real child booked with one). Reassign or delete that record
-- first; nothing is removed until the whole script succeeds.
-- =============================================================================
begin;

delete from public.students where referral_source = 'demo-data';
delete from public.parents where notes = 'demo-data';
delete from auth.users where email like '%@demo.example';

commit;

select
  (select count(*) from public.students where referral_source = 'demo-data') as demo_children_left,
  (select count(*) from auth.users where email like '%@demo.example') as demo_logins_left;
