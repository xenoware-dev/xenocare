-- Run with: supabase test db
-- Everything runs in a transaction and is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- ---------------------------------------------------------------- fixtures --
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@test.local',     '{"role":"owner"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin.a@test.local',   '{"role":"admin"}'),
  ('00000000-0000-0000-0000-0000000000a3', 'therapist@test.local', '{"role":"therapist"}');

insert into public.branches (id, code, name) values
  ('00000000-0000-0000-0000-0000000000b1', 'TSTA', 'Test A'),
  ('00000000-0000-0000-0000-0000000000b2', 'TSTB', 'Test B');

insert into public.staff_branches (profile_id, branch_id, is_primary) values
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000b1', true),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000b1', true);

insert into public.students (id, home_branch_id, first_name) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Assigned A'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', 'Unassigned A'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000b2', 'Student B');

insert into public.student_therapists (student_id, therapist_id, branch_id, therapy_type) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a3',
   '00000000-0000-0000-0000-0000000000b1', 'speech');

insert into public.invoices (id, branch_id, student_id, due_date) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1',
   '00000000-0000-0000-0000-0000000000c1', current_date + 7);
insert into public.invoice_items (invoice_id, description, quantity, unit_price) values
  ('00000000-0000-0000-0000-0000000000d1', 'Speech therapy session', 2, 2500);

-- ------------------------------------------------------- triggers / logic --
select is((select role::text from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
          'owner', 'profile created from auth user with app_metadata role');

select matches((select invoice_no from public.invoices where id = '00000000-0000-0000-0000-0000000000d1'),
               '^TSTA-[0-9]{4}-00001$', 'invoice number generated per branch');

select is((select subtotal from public.invoices where id = '00000000-0000-0000-0000-0000000000d1'),
          5000.00::numeric, 'invoice subtotal follows items');

insert into public.payments (invoice_id, amount) values ('00000000-0000-0000-0000-0000000000d1', 2000);
select is((select status::text from public.invoices where id = '00000000-0000-0000-0000-0000000000d1'),
          'partial', 'partial payment => partial');

insert into public.payments (invoice_id, amount) values ('00000000-0000-0000-0000-0000000000d1', 3000);
select is((select status::text || ':' || balance from public.invoices where id = '00000000-0000-0000-0000-0000000000d1'),
          'paid:0.00', 'full payment => paid, balance 0');

insert into public.appointments (branch_id, student_id, therapist_id, therapy_type, start_at, end_at) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-0000000000a3', 'speech', '2030-01-01 10:00+00', '2030-01-01 11:00+00');

select throws_ok($$
  insert into public.appointments (branch_id, student_id, therapist_id, therapy_type, start_at, end_at) values
    ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c2',
     '00000000-0000-0000-0000-0000000000a3', 'speech', '2030-01-01 10:30+00', '2030-01-01 11:30+00')
$$, '23P01', null, 'therapist cannot be double-booked');

-- ------------------------------------------------------------------- RLS --
-- Admin of branch A
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);

select is((select count(*) from public.students where id in
             ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2')),
          2::bigint, 'admin A sees branch A students');
select is((select count(*) from public.students where id = '00000000-0000-0000-0000-0000000000c3'),
          0::bigint, 'admin A cannot see branch B students');
select is((select sum(revenue) from public.v_branch_revenue_monthly
            where branch_id = '00000000-0000-0000-0000-0000000000b1'),
          5000.00::numeric, 'admin A sees branch A revenue');

-- Therapist
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);

select is((select count(*) from public.students where id = '00000000-0000-0000-0000-0000000000c1'),
          1::bigint, 'therapist sees assigned student');
select is((select count(*) from public.students where id = '00000000-0000-0000-0000-0000000000c2'),
          0::bigint, 'therapist cannot see unassigned student');
select is((select count(*) from public.invoices), 0::bigint, 'therapist cannot see invoices');

reset role;
select * from finish();
rollback;
