-- =============================================================================
-- DEMO DATA for every active branch.
-- Paste into Dashboard -> SQL Editor and Run. Takes ~10-30 seconds.
--
-- Per branch it creates:
--   * 1 branch admin + 4 therapists (Speech, OT, Physio, Special education),
--     each with working hours Mon-Sat 09:00-17:00 and a password login
--   * 22 children with a parent, care team, diagnosis and school
--     (20 in therapy, 1 on the waitlist, 1 newly registered and not yet booked)
--   * an initial assessment and a treatment plan with 3 SMART goals per therapy
--   * 5 weeks of past sessions + 2 weeks ahead: attendance, signed SOAP notes,
--     goal progress that improves over time, some no-shows and cancellations,
--     and a few unsigned notes from the last days
--   * progress reports (final for the past weeks, drafts for this month), leave requests
--
-- Re-runnable: it first deletes the previous demo data, then builds fresh data
-- around TODAY. Run it again on the morning of a demo so "today" has sessions.
-- Remove everything with demo_data_remove.sql. Real data is never touched.
--
-- Demo logins: <first>.<last>.<branch code>@demo.example, e.g.
--   priya.sundaram.gdv@demo.example  (password below; email/password sign-in
--   must be enabled under Authentication -> Providers -> Email)
-- Parents are not opted in to WhatsApp, so no reminder is ever sent to them.
-- =============================================================================

do $$
declare
  c_password constant text := 'Absolute@Demo2026';   -- password for every demo login
  c_domain   constant text := 'demo.example';
  c_marker   constant text := 'demo-data';

  types public.therapy_type[] := array['speech', 'ot', 'physio', 'other']::public.therapy_type[];

  admin_names text[] := array['Kavitha Ramesh', 'Arun Prakash', 'Deepa Natarajan', 'Suresh Babu', 'Meena Krishnan'];
  -- 4 per branch, in the order of `types`
  therapist_names text[] := array[
    'Priya Sundaram',  'Rahul Varma',        'Lakshmi Devi',      'Anitha Joseph',
    'Nandhini Ravi',   'Karthik Selvaraj',   'Prakash Raj',       'Jayanthi Raman',
    'Swetha Balaji',   'Aishwarya Iyer',     'Sangeetha Murugan', 'Bhavani Sekar',
    'Harini Mohan',    'Vignesh Kumar',      'Dinesh Kannan',     'Mohammed Imran',
    'Divya Shankar',   'Lavanya Srinivasan', 'Revathi Gopal',     'Shalini Paul'];
  designations text[] := array['Speech-language pathologist', 'Occupational therapist', 'Physiotherapist', 'Special educator'];
  qualifications text[] := array['MASLP', 'MOT (Paediatrics)', 'BPT, MPT (Neuro)', 'B.Ed (Special Education)'];
  colors text[] := array['#e76f51', '#e9a23b', '#3a86c8', '#8e6cc4'];

  boys text[] := array['Aarav', 'Kavin', 'Ishaan', 'Vihaan', 'Arjun', 'Dhruv', 'Rithvik', 'Mithran', 'Yuvan', 'Nikhil',
                       'Advik', 'Tharun', 'Harish', 'Rohan', 'Aadhav', 'Krish', 'Surya', 'Jeevan', 'Akilan', 'Varun',
                       'Sai Krishna', 'Nithin', 'Aditya', 'Hemanth', 'Lokesh', 'Sachin', 'Dev', 'Kabir', 'Ashwin', 'Gautham'];
  girls text[] := array['Diya', 'Meera', 'Anika', 'Saanvi', 'Aadhya', 'Nila', 'Kaviya', 'Ishita', 'Tanvi', 'Yazhini',
                        'Shreya', 'Mahathi', 'Aaradhya', 'Lakshana', 'Riya', 'Sanjana', 'Iniya', 'Keerthana', 'Pooja', 'Nithya',
                        'Oviya', 'Akshara', 'Bhavya', 'Charvi', 'Dharshini', 'Gowri', 'Janani', 'Kirthika', 'Madhu', 'Tara'];
  surnames text[] := array['Kumar', 'Raman', 'Menon', 'Iyer', 'Nair', 'Rajan', 'Murugan', 'Krishnan', 'Subramanian', 'Venkatesh',
                           'Balaji', 'Shankar', 'Natarajan', 'Pillai', 'Rao', 'Reddy', 'Chandran', 'Ganesan', 'Arumugam', 'Prabhu',
                           'Mohan', 'Anand', 'Ravi', 'Sekar', 'Vasudevan'];
  fathers text[] := array['Ramesh', 'Senthil', 'Karthikeyan', 'Vijay', 'Saravanan', 'Manoj', 'Ganesh', 'Rajesh', 'Murali', 'Balaji',
                          'Prabhakar', 'Sathish', 'Anand', 'Vinoth', 'Arul'];
  mothers text[] := array['Kavya', 'Revathi', 'Priya', 'Sowmya', 'Gayathri', 'Vidhya', 'Saranya', 'Deepika', 'Uma', 'Janani',
                          'Bhuvana', 'Malathi', 'Radha', 'Hema', 'Archana'];

  -- by therapy (speech, ot, physio, other), 3 options each, '|' separates diagnoses
  diagnoses text[] := array[
    'Speech & language delay', 'Autism spectrum disorder (ASD)|Speech & language delay', 'Speech sound disorder',
    'Sensory processing disorder', 'ADHD', 'Autism spectrum disorder (ASD)|Sensory processing disorder',
    'Cerebral palsy (spastic diplegia)', 'Global developmental delay', 'Down syndrome',
    'Specific learning disability', 'ADHD|Specific learning disability', 'Intellectual disability (mild)'];
  histories text[] := array[
    'Born at term, normal delivery. First words at 2.5 years; no two-word phrases until 3.5 years.',
    'Born at term by C-section. Motor milestones on time. Parents noticed sensitivity to noise and clothing textures from age 2.',
    'Born at 34 weeks; 10 days in NICU. Sat at 11 months, walked at 2 years 3 months.',
    'Born at term. Milestones mildly delayed. Difficulty with reading and number concepts reported by school in UKG.'];
  schools text[] := array['Velammal Vidyalaya', 'Little Flower Matriculation School', 'DAV Public School', 'Chettinad Vidyashram',
                          'St. Joseph''s Matriculation School', 'Sri Sankara Vidyalaya'];
  allergies text[] := array['Peanuts', 'Dust mites', 'Egg', 'Latex'];
  medications text[] := array['Melatonin 1 mg at bedtime', 'Syrup Risperidone 0.5 ml at night', 'Sodium valproate 200 mg twice daily', 'Iron supplement once daily'];

  -- SMART goal library: 4 per therapy -> domain, description, measurable criteria, baseline %
  g_domain text[] := array[
    'Receptive language', 'Expressive language', 'Articulation', 'Social communication',
    'Fine motor', 'Sensory regulation', 'Self-care', 'Visual-motor',
    'Gross motor', 'Balance', 'Strength', 'Gait',
    'Numeracy', 'Attention', 'Literacy', 'Social skills'];
  g_desc text[] := array[
    'Follows 2-step instructions without gestures',
    'Uses 3-4 word phrases to request and comment',
    'Produces /s/ and /sh/ at the start of words',
    'Takes 4 conversational turns on a shared topic',
    'Copies a circle, cross and square using a tripod grasp',
    'Stays seated for a 15-minute table task with sensory breaks',
    'Buttons and unbuttons 3 large buttons independently',
    'Cuts along a 15 cm line staying within 1 cm',
    'Climbs 4 stairs with alternate feet using one handrail',
    'Stands on one leg for 5 seconds on each side',
    'Completes 10 sit-to-stands from a low bench without hand support',
    'Walks 20 m on an uneven surface without losing balance',
    'Identifies and orders numbers 1-20',
    'Completes a 3-step worksheet with no more than one prompt',
    'Reads and matches 20 sight words to pictures',
    'Greets peers and teacher by name on arrival'];
  g_criteria text[] := array[
    '80% accuracy over 3 consecutive sessions', '80% of opportunities across 3 sessions', '80% accuracy at word level', '4 of 5 opportunities',
    '4 of 5 trials', '80% of sessions', '4 of 5 trials', '80% accuracy',
    '4 of 5 trials', '80% of trials', '4 of 5 sets', '4 of 5 trials',
    '80% accuracy over 3 sessions', '4 of 5 worksheets', '80% accuracy', '4 of 5 days'];
  g_base int[] := array[30, 25, 20, 30, 30, 25, 20, 25, 20, 25, 30, 30, 35, 25, 20, 30];

  plan_titles text[] := array['Speech & language therapy plan', 'Occupational therapy plan', 'Physiotherapy plan', 'Individual education plan (IEP)'];
  plan_objectives text[] := array[
    'Improve functional communication so the child can request, comment and follow routines at home and school.',
    'Build fine motor, sensory regulation and self-care skills for more independence at home and in class.',
    'Improve strength, balance and gait for safe, independent mobility.',
    'Strengthen early academic, attention and classroom social skills.'];

  -- session note text: 4 per therapy (%s = child's first name)
  observations text[] := array[
    '%s named 8 of 12 picture cards and used two-word phrases ("more juice", "car go") in play. Joint attention held for about 5 minutes.',
    '%s followed 2-step instructions in 6 of 10 trials with a visual cue. Imitated /p/, /b/, /m/ in CV syllables.',
    'Took 3 turns in a ball game. %s requested with "I want ___" after a verbal model.',
    '%s answered "what" and "where" questions about a picture book; 7 of 10 correct.',
    '%s copied vertical and horizontal lines; circle attempted with hand-over-hand support. Tripod grasp emerging.',
    'After 10 minutes on the swing, %s sat for a 12-minute table task with one reminder.',
    '%s threaded 6 large beads and cut along a 10 cm line, staying within 1.5 cm.',
    '%s buttoned 2 of 3 large buttons on the dressing board with verbal prompts.',
    '%s climbed 4 steps holding the rail with a step-to pattern; light support needed coming down.',
    'Single-leg stance 3 s right, 2 s left. %s walked the balance beam with a one-hand hold.',
    '%s completed 8 sit-to-stands from a low bench without using hands. Mild fatigue after 20 minutes.',
    '%s walked 15 m on the uneven mat with one loss of balance. Heel strike improving on the right.',
    '%s matched numbers 1-15 and counted objects to 10 with one-to-one correspondence.',
    '%s completed a 3-step worksheet (trace, colour, match) with 2 prompts. On task for 15 minutes.',
    '%s read 12 of 20 sight words and matched them to pictures.',
    '%s greeted the teacher by name on arrival and waited for a turn in circle time with a visual timer.'];
  activities text[] := array[
    'Picture-card naming, bubbles for requesting, "Brown Bear" book, turn-taking with a ball',
    'Following-directions game, oral-motor imitation, minimal pairs with picture cards',
    'Pretend kitchen play, sentence strips, sequencing cards',
    'Story retell with props, wh-question cards, barrier game',
    'Playdough strengthening, pegboard, pre-writing strokes on a vertical surface',
    'Swing and trampoline (vestibular input), heavy-work obstacle course, table task',
    'Bead threading, scissor skills on thick paper, tweezers transfer game',
    'Dressing board, zip and button practice, lunch-box opening',
    'Stair climbing, step-ups, ball kicking with alternate feet',
    'Balance beam, single-leg stance games, wobble board',
    'Sit-to-stand, wall squats, bridging, animal walks',
    'Obstacle walk on uneven mats, treadmill at slow speed, ramp walking',
    'Number line game, counting with beads, number matching puzzle',
    'Structured worksheet routine with a visual checklist and timer',
    'Sight-word bingo, picture matching, flashcards',
    'Greeting song, circle-time turn-taking, peer ball game'];
  home_programs text[] := array[
    'Name 5 objects at meal times and wait for %s to request before giving.',
    'Give one 2-step instruction during bath time daily ("take the towel and give it to amma").',
    'Practise /s/ words from the picture sheet for 5 minutes a day.',
    'Read the picture book together each night and ask 2 "what" questions.',
    'Playdough rolling and pinching for 10 minutes a day.',
    'Follow the sensory diet sheet: 10 minutes of jumping or swinging before homework.',
    'Let %s button their own school shirt every morning, with help only for the last button.',
    'Cut along thick lines on old newspaper, 5 minutes a day.',
    'Climb the apartment stairs with alternate feet, holding the rail, twice a day.',
    'Stand on one leg while brushing teeth; count to 5 on each side.',
    'Do 10 sit-to-stands from a low stool, 2 sets a day.',
    'Walk barefoot on grass or sand for 10 minutes in the evening.',
    'Count objects at home (spoons, shoes) up to 20.',
    'Use the visual checklist for homework; praise each finished step.',
    'Revise the 5 sight words in the take-home pack every evening.',
    'Practise greeting family members and neighbours by name.'];
  next_steps text[] := array[
    'Continue current goals; move to 3-step instructions next week.',
    'Fade the verbal model; introduce carrier phrases in play.',
    'Increase task time by 2 minutes; reduce sensory breaks.',
    'Progress to descending stairs with alternate feet.',
    'Introduce teen numbers on the number line.',
    'Add one new sight word each session.'];
  parent_reports text[] := array[
    'Mother reports %s is using more words at home, especially at meal times.',
    'Father says %s slept well and had breakfast before the session.',
    'Parent reports a difficult morning; %s was upset during the drive.',
    'Practising the home program daily; the picture schedule is helping.',
    'Grandmother brought %s today; no new concerns.',
    'Parent noticed %s is more patient waiting for turns with siblings.',
    'School teacher says %s is participating more in class.',
    'Parent reports a mild cold this week; appetite reduced.'];
  analyses text[] := array[
    'Responding well to structure but still needs high support. Continue building baseline and rapport.',
    'Steady progress on the targeted goals; prompt levels are reducing.',
    'Close to criterion on most goals. Plan to fade prompts and generalise to home and school.'];
  moods text[] := array['Calm', 'Cooperative', 'Cooperative', 'Calm', 'Anxious', 'Tired', 'Irritable', 'Cooperative'];
  cancel_reasons text[] := array['Parent requested', 'Child unwell', 'Family function', 'Transport issue'];
  slot_times time[] := array['09:30', '10:20', '11:10', '12:00', '14:30', '15:20', '16:10']::time[];

  r_branch   record;
  bi         int := 0;
  v_tz       text;
  v_today    date;
  v_now      timestamptz := now();
  v_from     date;
  v_to       date;
  v_admin    uuid;
  v_staff    uuid[];
  v_uid      uuid;
  v_name     text;
  v_email    text;
  v_role     public.app_role;
  v_soap     uuid;
  v_report_t uuid;
  v_tmpl     record;

  p          int;
  gi         int;
  v_sid      uuid;
  v_pid      uuid;
  v_first    text;
  v_last     text;
  v_gender   public.gender;
  v_ptype    int;          -- 1..4 index into types
  v_status   public.student_status;
  v_intake   date;
  v_rel      text;
  v_diag     text[];

  k          int;          -- 1 = primary therapy, 2 = second therapy
  v_ti       int;          -- therapist / therapy index 1..4
  v_ther     uuid;
  v_type     public.therapy_type;
  v_slot     time;
  v_days     int[];
  v_assess   uuid;
  v_plan     uuid;
  v_goals    uuid[];
  v_bases    int[];
  v_gidx     int[];
  v_rg       uuid;
  j          int;
  v_gid      uuid;

  v_d        date;
  v_start    timestamptz;
  v_end      timestamptz;
  v_appt     uuid;
  v_r        float8;
  v_astatus  public.appointment_status;
  v_attend   public.attendance_status;
  v_note     text;         -- 'signed' | 'draft' | 'none'
  v_sess     uuid;
  v_f        float8;
  v_acc      int;
  v_results  jsonb;
  v_prompt   text;
  v_leave_day date;
  v_count    int;
  v_done     int;
begin
  perform setseed(0.2026);

  -- ---------------------------------------------------------------- clean up
  delete from public.students where referral_source = c_marker;
  delete from public.parents where notes = c_marker;
  delete from auth.users where email like '%@' || c_domain;

  select id into v_soap from public.form_templates where kind = 'soap' and is_active order by version desc limit 1;
  select id into v_report_t from public.form_templates where kind = 'progress_report' and is_active order by version desc limit 1;

  for r_branch in
    select id, code, name, coalesce(nullif(timezone, 'UTC'), 'Asia/Kolkata') as tz
      from public.branches where is_active and deleted_at is null order by created_at, name
  loop
    bi := bi + 1;
    v_tz := r_branch.tz;
    v_today := (v_now at time zone v_tz)::date;
    v_from := v_today - 35;
    v_to := v_today + 14;
    v_leave_day := v_today + 7 + case when extract(dow from v_today + 7) = 0 then 1 else 0 end;

    -- ------------------------------------------------------------- staff
    v_staff := array[]::uuid[];
    for k in 0..4 loop
      if k = 0 then
        v_name := admin_names[1 + (bi - 1) % 5];
        v_role := 'admin';
      else
        v_name := therapist_names[((bi - 1) % 5) * 4 + k];
        v_role := 'therapist';
      end if;
      v_uid := gen_random_uuid();
      v_email := lower(replace(v_name, ' ', '.')) || '.' || lower(r_branch.code) || '@' || c_domain;

      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                              raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                              confirmation_token, recovery_token, email_change_token_new, email_change)
      values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email,
              extensions.crypt(c_password, extensions.gen_salt('bf')), v_now,
              jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', v_role),
              jsonb_build_object('full_name', v_name), v_now, v_now, '', '', '', '');
      insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), v_uid::text, v_uid,
              jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
              'email', v_now, v_now, v_now);

      -- the on_auth_user_created trigger made the profile; fill in the rest
      update public.profiles
         set full_name = v_name, role = v_role, is_active = true,
             phone = '+91 90000 ' || lpad((bi * 10 + k)::text, 5, '0')
       where id = v_uid;
      insert into public.staff_branches (profile_id, branch_id, is_primary) values (v_uid, r_branch.id, true);

      if k = 0 then
        v_admin := v_uid;
        insert into public.staff_details (profile_id, employee_code, designation, join_date, employment_type)
        values (v_uid, 'DEMO-' || r_branch.code || '-ADM', 'Branch administrator', v_today - 400, 'full_time');
      else
        v_staff := v_staff || v_uid;
        insert into public.staff_details (profile_id, employee_code, designation, therapy_types, qualifications,
                                          join_date, employment_type, calendar_color)
        values (v_uid, 'DEMO-' || r_branch.code || '-T' || k, designations[k], array[types[k]], qualifications[k],
                v_today - (200 + k * 90), 'full_time', colors[k]);
        insert into public.therapist_availability (profile_id, branch_id, weekday, start_time, end_time, effective_from)
        select v_uid, r_branch.id, wd, '09:00', '17:00', v_today - 120 from generate_series(1, 6) wd;
      end if;
    end loop;

    -- ------------------------------------------------------------- children
    -- p 0..19 in therapy, 20 = waitlist, 21 = newly registered (not booked yet)
    for p in 0..21 loop
      gi := (bi - 1) * 22 + p;
      v_gender := case when gi % 2 = 0 then 'male' else 'female' end;
      v_first := case when gi % 2 = 0 then boys[1 + (gi / 2) % 30] else girls[1 + (gi / 2) % 30] end;
      v_last := surnames[1 + (gi * 7 + bi) % 25];
      v_ptype := 1 + p % 4;
      v_status := case when p = 20 then 'waitlist' else 'active' end;
      v_intake := case when p >= 20 then v_today - (p - 18) * 2 else v_today - (60 + floor(random() * 300))::int end;
      v_diag := string_to_array(diagnoses[(v_ptype - 1) * 3 + 1 + (gi % 3)], '|');

      insert into public.students (home_branch_id, first_name, last_name, date_of_birth, gender, diagnosis,
                                   medical_history, allergies, medications, school_name, grade,
                                   referral_source, status, intake_date, created_by, created_at)
      values (r_branch.id, v_first, v_last,
              v_today - (365 * 3 + floor(random() * 365 * 8))::int, v_gender, v_diag,
              histories[v_ptype],
              case when gi % 7 = 0 then allergies[1 + (gi / 7) % 4] end,
              case when gi % 6 = 1 then medications[1 + (gi / 6) % 4] end,
              case when v_ptype = 4 then 'Absolute Special School' else schools[1 + gi % 6] end,
              (array['LKG', 'UKG', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4'])[1 + gi % 6],
              c_marker, v_status, v_intake, v_admin, v_intake::timestamptz)
      returning id into v_sid;

      v_rel := case when gi % 3 = 0 then 'father' else 'mother' end;
      insert into public.parents (full_name, phone, whatsapp_number, whatsapp_opt_in, notes, created_by)
      values ((case when v_rel = 'father' then fathers[1 + gi % 15] else mothers[1 + gi % 15] end) || ' ' || v_last,
              '+91 90000 ' || lpad((1000 + gi)::text, 5, '0'),
              '+9190000' || lpad((1000 + gi)::text, 5, '0'),
              false, c_marker, v_admin)
      returning id into v_pid;
      insert into public.student_parents (student_id, parent_id, relationship, is_primary_contact, receives_whatsapp)
      values (v_sid, v_pid, v_rel, true, false);

      continue when p = 20;  -- waitlist: no care team yet

      -- primary therapy (+ a second therapy for children 0..7)
      for k in 1..2 loop
        exit when k = 2 and p >= 8;
        v_ti := case when k = 1 then v_ptype else 1 + (p % 4 + 1) % 4 end;
        v_ther := v_staff[v_ti];
        v_type := types[v_ti];
        insert into public.student_therapists (student_id, therapist_id, branch_id, therapy_type, start_date)
        values (v_sid, v_ther, r_branch.id, v_type, v_intake);

        continue when p = 21;  -- new child: care team assigned, nothing else yet

        -- initial assessment (no template for special education)
        v_assess := null;
        select id, version into v_tmpl from public.form_templates
         where kind = 'assessment' and therapy_type = v_type and is_active order by version desc limit 1;
        if found then
          insert into public.assessments (student_id, branch_id, therapist_id, template_id, template_version, therapy_type,
                                          assessment_date, responses, summary, recommendations, status, finalized_at)
          values (v_sid, r_branch.id, v_ther, v_tmpl.id, v_tmpl.version, v_type, v_intake + 3,
                  case v_type
                    when 'speech' then jsonb_build_object(
                      'history', jsonb_build_object('concerns', 'Limited words for age; difficulty following instructions',
                                                    'languages', jsonb_build_array('Tamil', 'English'),
                                                    'milestones', 'First words at 2.5 years; two-word phrases at 3.5 years'),
                      'receptive', jsonb_build_object('follows_commands', '1-step', 'receptive_score', 2 + gi % 2),
                      'expressive', jsonb_build_object('mlu', 1.5 + (gi % 3) * 0.4, 'expressive_score', 2),
                      'articulation', jsonb_build_object('error_sounds', '/s/, /sh/, /r/', 'fluency', 'Age appropriate',
                                                         'oral_motor', 'Reduced lip rounding; no drooling'),
                      'impression', jsonb_build_object('diagnosis', 'Mixed receptive-expressive language delay',
                                                       'recommendation', 'Speech therapy 3 times a week; parent training for home practice'))
                    when 'ot' then jsonb_build_object(
                      'history', jsonb_build_object('concerns', 'Not ready for handwriting; meltdowns in noisy places'),
                      'motor', jsonb_build_object('fine_motor', 2, 'gross_motor', 3, 'grasp', 'Fisted, tripod emerging'),
                      'sensory', jsonb_build_object('sensory_profile', jsonb_build_array('Vestibular seeking', 'Auditory sensitive'),
                                                    'sensory_notes', 'Seeks spinning; covers ears in crowded places'),
                      'adl', jsonb_build_object('self_care', 'Needs help with buttons and opening the lunch box'),
                      'impression', jsonb_build_object('summary', 'Fine motor and sensory regulation below age level',
                                                       'recommendation', 'OT 3 times a week with a sensory diet at home'))
                    else jsonb_build_object(
                      'history', jsonb_build_object('complaint', 'Frequent falls and difficulty climbing stairs',
                                                    'medical', 'Born at 34 weeks; NICU stay 10 days'),
                      'examination', jsonb_build_object('posture', 'Mild crouch; increased lumbar lordosis',
                                                        'tone', case when v_diag[1] like 'Cerebral%' then 'Hypertonia' else 'Hypotonia' end,
                                                        'rom', 'Functional; tight hamstrings', 'strength', 'Core and hip abductors 3/5',
                                                        'balance', 'Wide base of support; cannot stand on one leg', 'pain', 0),
                      'impression', jsonb_build_object('summary', 'Delayed gross motor milestones with reduced balance',
                                                       'recommendation', 'Physiotherapy 3 times a week with a home exercise program'))
                  end,
                  case v_type when 'speech' then 'Mixed receptive-expressive language delay'
                              when 'ot' then 'Fine motor and sensory regulation below age level'
                              else 'Delayed gross motor milestones with reduced balance' end,
                  'Therapy 3 times a week with a home program; review in 3 months.',
                  'final', (v_intake + 3)::timestamptz)
          returning id into v_assess;
        end if;

        -- treatment plan with 3 SMART goals (skip one of the 4 library goals)
        insert into public.treatment_plans (student_id, branch_id, therapist_id, assessment_id, therapy_type, title,
                                            long_term_objective, start_date, review_date, status)
        values (v_sid, r_branch.id, v_ther, v_assess, v_type, plan_titles[v_ti], plan_objectives[v_ti],
                greatest(v_intake + 7, v_from - 7),
                case when p = 5 and k = 1 then v_today - 2 else v_today + 14 + (gi * 5) % 45 end,
                'active')
        returning id into v_plan;

        v_goals := array[]::uuid[];
        v_bases := array[]::int[];
        v_gidx := array[]::int[];
        for j in 0..3 loop
          continue when j = p % 4;
          insert into public.therapy_goals (plan_id, domain, description, measurable_criteria, target_date,
                                            baseline_value, target_value, unit, sort_order)
          values (v_plan, g_domain[(v_ti - 1) * 4 + j + 1], g_desc[(v_ti - 1) * 4 + j + 1],
                  g_criteria[(v_ti - 1) * 4 + j + 1], v_today + 60, g_base[(v_ti - 1) * 4 + j + 1], 80, '%',
                  coalesce(array_length(v_goals, 1), 0))
          returning id into v_gid;
          v_goals := v_goals || v_gid;
          v_bases := v_bases || g_base[(v_ti - 1) * 4 + j + 1];
          v_gidx := v_gidx || ((v_ti - 1) * 4 + j + 1);
        end loop;

        -- weekly slot. Primaries: slots 1-5, Mon/Wed/Fri or Tue/Thu/Sat.
        -- Second therapy: slots 6-7, Mon/Wed or Tue/Thu. No therapist or child is double-booked.
        if k = 1 then
          v_slot := slot_times[1 + p / 4];
          v_days := case when (p / 4) % 2 = 0 then array[1, 3, 5] else array[2, 4, 6] end;
        else
          v_slot := slot_times[6 + p / 4];
          v_days := case when (p / 4) % 2 = 0 then array[1, 3] else array[2, 4] end;
        end if;

        insert into public.recurrence_groups (branch_id, student_id, therapist_id, therapy_type, weekdays, start_time,
                                              duration_min, start_date, end_date, created_by)
        values (r_branch.id, v_sid, v_ther, v_type, v_days::smallint[], v_slot, 45, v_from, v_to, v_admin)
        returning id into v_rg;

        -- ------------------------------------------------------- sessions
        for v_d in select gs::date from generate_series(v_from, v_to, interval '1 day') gs loop
          continue when not (extract(dow from v_d)::int = any (v_days));
          v_start := (v_d + v_slot) at time zone v_tz;
          v_end := v_start + interval '45 minutes';
          v_r := random();
          v_attend := null;
          v_note := 'none';

          if v_end <= v_now then                                   -- past
            if v_r < 0.04 then
              v_astatus := 'cancelled';
            elsif v_r < 0.11 then
              v_astatus := 'no_show';
              v_attend := 'absent';
            else
              v_attend := case when random() < 0.1 then 'late' else 'present' end;
              if (v_d >= v_today - 3 and random() < 0.35)
                 or (v_ti = 4 and bi % 2 = 1 and v_d >= v_today - 6 and random() < 0.6) then
                v_astatus := 'scheduled';                           -- note not signed yet
                v_note := case when random() < 0.5 then 'draft' else 'none' end;
              else
                v_astatus := 'completed';
                v_note := 'signed';
              end if;
            end if;
          elsif v_start <= v_now then                               -- happening now
            v_astatus := 'scheduled';
            v_attend := 'present';
          else                                                      -- upcoming
            v_astatus := case when v_d <= v_today + 1 then 'confirmed' else 'scheduled' end;
            if v_r < 0.03 then v_astatus := 'cancelled'; end if;
          end if;

          -- one therapist in the first branch is on approved leave next week
          if bi = 1 and v_ti = 3 and v_d = v_leave_day then
            v_astatus := 'cancelled';
          end if;

          insert into public.appointments (branch_id, student_id, therapist_id, therapy_type, start_at, end_at, status,
                                           recurrence_group_id, cancel_reason, cancelled_by, cancelled_at, created_by, created_at)
          values (r_branch.id, v_sid, v_ther, v_type, v_start, v_end, v_astatus, v_rg,
                  case when v_astatus = 'cancelled' then
                    case when bi = 1 and v_ti = 3 and v_d = v_leave_day then 'Therapist on leave'
                         else cancel_reasons[1 + floor(random() * 4)::int] end end,
                  case when v_astatus = 'cancelled' then v_admin end,
                  case when v_astatus = 'cancelled' then least(v_start - interval '1 day', v_now) end,
                  v_admin, least(v_from::timestamptz, v_now))
          returning id into v_appt;

          if v_attend is not null then
            insert into public.student_attendance (appointment_id, student_id, branch_id, attendance_date, status,
                                                   arrived_at, marked_by)
            values (v_appt, v_sid, r_branch.id, v_d, v_attend,
                    case v_attend when 'present' then v_start - interval '5 minutes'
                                  when 'late' then v_start + interval '12 minutes' end,
                    v_admin);
          end if;

          continue when v_note = 'none';

          -- note + goal progress that improves over the 5 weeks
          v_f := greatest(0, least(1, (v_d - v_from)::float8 / 35));
          v_prompt := case when v_f < 0.25 then 'Physical' when v_f < 0.45 then 'Model' when v_f < 0.65 then 'Gestural'
                           when v_f < 0.85 then 'Verbal' else 'Independent' end;
          v_results := '[]'::jsonb;
          for j in 1..3 loop
            continue when j = 1 + (v_d - v_from) % 3;               -- 2 of the 3 goals each session
            v_acc := greatest(0, least(100, round(v_bases[j] + (80 - v_bases[j]) * v_f * (0.75 + 0.1 * j) + (random() * 16 - 8))::int));
            v_results := v_results || jsonb_build_object('goal_id', v_goals[j], 'trials', 10, 'successes', round(v_acc / 10.0)::int,
                                                         'prompt_level', v_prompt, 'comment', null);
          end loop;

          insert into public.therapy_sessions (appointment_id, student_id, therapist_id, branch_id, plan_id, therapy_type,
                                               session_date, start_at, duration_min, note_format, template_id, notes,
                                               activities, home_program, parent_feedback, next_session_plan,
                                               is_locked, signed_at, created_at)
          values (v_appt, v_sid, v_ther, r_branch.id, v_plan, v_type, v_d, v_start, 45, 'smart', v_soap,
                  jsonb_build_object(
                    'subjective', jsonb_build_object('parent_report', format(parent_reports[1 + floor(random() * 8)::int], v_first),
                                                     'student_mood', moods[1 + floor(random() * 8)::int]),
                    'objective', jsonb_build_object('observations', format(observations[(v_ti - 1) * 4 + 1 + (v_d - v_from) % 4], v_first)),
                    'assessment', jsonb_build_object('analysis', analyses[1 + least(2, floor(v_f * 3)::int)]),
                    'plan', jsonb_build_object('next_steps', next_steps[1 + floor(random() * 6)::int],
                                               'home_program', format(home_programs[(v_ti - 1) * 4 + 1 + p % 4], v_first)),
                    'goal_results', v_results),
                  activities[(v_ti - 1) * 4 + 1 + (v_d - v_from) % 4],
                  format(home_programs[(v_ti - 1) * 4 + 1 + p % 4], v_first),
                  format(parent_reports[1 + (v_d - v_from) % 8], v_first),
                  next_steps[1 + (v_d - v_from) % 6],
                  v_note = 'signed',
                  case when v_note = 'signed' then v_end + (interval '1 hour' * (1 + floor(random() * 6))) end,
                  v_end)
          returning id into v_sess;

          insert into public.goal_progress (goal_id, session_id, trials, successes, prompt_level, recorded_by, recorded_at)
          select (r ->> 'goal_id')::uuid, v_sess, (r ->> 'trials')::int, (r ->> 'successes')::int, r ->> 'prompt_level', v_ther, v_start
            from jsonb_array_elements(v_results) r;
        end loop;

        -- progress reports: final for the past weeks (every 3rd child), drafts for this month (2 per branch)
        if v_report_t is not null and k = 1 and (p % 3 = 0 or p in (1, 6)) then
          select count(*) filter (where status <> 'cancelled'),
                 count(*) filter (where status = 'completed' or (status = 'scheduled' and start_at < v_now))
            into v_count, v_done
            from public.appointments where student_id = v_sid and therapist_id = v_ther and start_at < v_now
             and start_at >= case when p in (1, 6) then date_trunc('month', v_today)::date else v_from end;

          insert into public.progress_reports (student_id, branch_id, therapist_id, template_id, therapy_type,
                                               period_start, period_end, content, summary, status, finalized_at)
          values (v_sid, r_branch.id, v_ther, v_report_t, v_type,
                  case when p in (1, 6) then date_trunc('month', v_today)::date else v_from end,
                  case when p in (1, 6) then v_today else v_today - 7 end,
                  jsonb_build_object(
                    'overview', jsonb_build_object(
                      'attendance', format('%s attended %s of %s scheduled sessions this period.', v_first, v_done, v_count),
                      'summary', format('%s has made steady progress this period. Prompt levels have reduced and %s is more engaged in sessions. Parents report carry-over of skills at home.', v_first, v_first)),
                    'goals', jsonb_build_object('goal_status', (
                      select jsonb_agg(jsonb_build_object('goal_id', v_goals[n],
                                                          'status', case when n = 1 then 'Progressing' when n = 2 then 'Progressing' else 'Not yet' end,
                                                          'comment', 'Moving from ' || v_bases[n] || '% at baseline towards the 80% target.'))
                        from generate_series(1, 3) n)),
                    'next', jsonb_build_object('recommendations', 'Continue therapy 3 times a week. Keep the home program going daily; review goals in 6 weeks.')),
                  format('%s has made steady progress this period.', v_first),
                  (case when p in (1, 6) then 'draft' else 'final' end)::public.record_status,
                  case when p in (1, 6) then null else (v_today - 5)::timestamptz end);
        end if;
      end loop;
    end loop;

    -- ------------------------------------------------------------- leave
    if bi = 1 then
      insert into public.staff_leaves (profile_id, from_date, to_date, leave_type, reason, status, reviewed_by, reviewed_at)
      values (v_staff[3], v_leave_day, v_leave_day, 'casual', 'Personal work', 'approved', v_admin, v_now - interval '2 days');
    end if;
    if bi in (1, 3) then
      insert into public.staff_leaves (profile_id, from_date, to_date, leave_type, reason, status)
      values (v_staff[1], v_today + 10, v_today + 11, 'casual', 'Family function', 'pending');
    end if;
    if bi = 2 then
      insert into public.staff_leaves (profile_id, from_date, to_date, leave_type, reason, status, reviewed_by, reviewed_at)
      values (v_staff[2], v_today - 12, v_today - 12, 'sick', 'Fever', 'approved', v_admin, v_now - interval '13 days');
    end if;

    raise notice 'Branch % (%): demo staff, children and sessions created', r_branch.name, r_branch.code;
  end loop;

  if bi = 0 then
    raise exception 'No active branches found';
  end if;
end;
$$;

-- What was created, per branch.
select b.name as branch,
       (select count(*) from public.staff_branches sb join public.profiles pr on pr.id = sb.profile_id
         where sb.branch_id = b.id and pr.email like '%@demo.example') as demo_staff,
       (select count(*) from public.students s where s.home_branch_id = b.id and s.referral_source = 'demo-data') as demo_children,
       (select count(*) from public.appointments a join public.students s on s.id = a.student_id
         where a.branch_id = b.id and s.referral_source = 'demo-data') as appointments,
       (select count(*) from public.therapy_sessions t join public.students s on s.id = t.student_id
         where t.branch_id = b.id and s.referral_source = 'demo-data' and t.is_locked) as signed_notes
  from public.branches b
 where b.is_active and b.deleted_at is null
 order by b.name;
