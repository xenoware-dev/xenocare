-- =============================================================================
-- Seed data: permissions, role defaults, organization, branches,
-- form templates (SOAP / SMART / assessments), WhatsApp templates.
-- Users are NOT seeded: create the owner via Express / Supabase dashboard with
-- app_metadata = {"role":"owner"} (see docs/database.md).
-- =============================================================================

insert into public.organization_settings (name, currency, default_timezone)
values ('Absolute Special School & Therapy Care', 'INR', 'Asia/Kolkata')
on conflict (id) do nothing;

insert into public.branches (code, name, city, timezone) values
  ('GDV', 'Guduvancherry', 'Chennai', 'Asia/Kolkata'),
  ('VDL', 'Vandalur',      'Chennai', 'Asia/Kolkata'),
  ('SPK', 'SP Koil',       'Chennai', 'Asia/Kolkata'),
  ('KLB', 'Kelambakkam',   'Chennai', 'Asia/Kolkata'),
  ('NGN', 'Nanganallur',   'Chennai', 'Asia/Kolkata')
on conflict (code) do nothing;

-- ----------------------------------------------------------------------------
-- Permissions
-- ----------------------------------------------------------------------------
insert into public.permissions (key, module, description) values
  ('dashboard.owner',     'dashboard',   'Organization-wide dashboard and revenue'),
  ('dashboard.branch',    'dashboard',   'Branch dashboard'),
  ('dashboard.therapist', 'dashboard',   'Personal therapist dashboard'),
  ('settings.manage',     'settings',    'Organization settings'),
  ('branches.manage',     'branches',    'Create and edit branches'),
  ('staff.view',          'staff',       'View staff'),
  ('staff.manage',        'staff',       'Create and edit staff, assign branches'),
  ('leaves.approve',      'staff',       'Approve staff leave'),
  ('students.view',       'students',    'View students'),
  ('students.manage',     'students',    'Register and edit students'),
  ('parents.manage',      'students',    'Manage parents / guardians'),
  ('appointments.view',   'scheduling',  'View appointments'),
  ('appointments.manage', 'scheduling',  'Create, reschedule, cancel appointments'),
  ('attendance.mark',     'scheduling',  'Mark student attendance'),
  ('sessions.write',      'clinical',    'Write session notes (SOAP / SMART)'),
  ('assessments.write',   'clinical',    'Perform assessments'),
  ('plans.write',         'clinical',    'Manage treatment plans and goals'),
  ('templates.manage',    'clinical',    'Manage assessment / note templates'),
  ('reports.view',        'reports',     'View reports'),
  ('reports.write',       'reports',     'Write progress reports'),
  ('billing.view',        'billing',     'View invoices and payments'),
  ('billing.manage',      'billing',     'Create invoices, record payments'),
  ('whatsapp.send',       'messaging',   'Send WhatsApp messages to parents'),
  ('audit.view',          'system',      'View audit logs')
on conflict (key) do nothing;

-- Owner: oversight + branches/admins. Patients, schedules and clinical work belong to branch admins.
insert into public.role_permissions (role, permission_key)
select 'owner'::public.app_role, key from public.permissions
 where key not in ('students.manage', 'parents.manage', 'appointments.manage', 'attendance.mark',
                   'sessions.write', 'assessments.write', 'plans.write', 'reports.write',
                   'billing.manage', 'whatsapp.send')
on conflict do nothing;

insert into public.role_permissions (role, permission_key)
select 'admin'::public.app_role, key from public.permissions
 where key not in ('dashboard.owner', 'settings.manage', 'branches.manage', 'dashboard.therapist')
on conflict do nothing;

insert into public.role_permissions (role, permission_key)
select 'therapist'::public.app_role, key from public.permissions
 where key in ('dashboard.therapist', 'students.view', 'appointments.view', 'attendance.mark',
               'sessions.write', 'assessments.write', 'plans.write', 'reports.view', 'reports.write')
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Form templates. Field types: text, textarea, number, select, multiselect,
-- checkbox, date, scale (min/max), table.
-- ----------------------------------------------------------------------------
insert into public.form_templates (name, kind, therapy_type, version, schema) values
('SOAP Note', 'soap', null, 1, '{
  "sections": [
    {"key": "subjective", "label": "Subjective", "fields": [
      {"key": "parent_report", "label": "Parent / caregiver report", "type": "textarea"},
      {"key": "student_mood", "label": "Mood / behaviour on arrival", "type": "select",
       "options": ["Calm", "Cooperative", "Anxious", "Irritable", "Tired"]}]},
    {"key": "objective", "label": "Objective", "fields": [
      {"key": "observations", "label": "Observations & measurements", "type": "textarea", "required": true}]},
    {"key": "assessment", "label": "Assessment", "fields": [
      {"key": "analysis", "label": "Clinical interpretation / progress", "type": "textarea", "required": true}]},
    {"key": "plan", "label": "Plan", "fields": [
      {"key": "next_steps", "label": "Plan for next session", "type": "textarea"},
      {"key": "home_program", "label": "Home program for parents", "type": "textarea"}]}
  ]}'::jsonb),
('SMART Goal Session Note', 'smart', null, 1, '{
  "sections": [
    {"key": "goals", "label": "Goals worked on", "fields": [
      {"key": "goal_results", "label": "Goal results", "type": "table", "columns": [
        {"key": "goal_id", "label": "Goal", "type": "goal_ref"},
        {"key": "trials", "label": "Trials", "type": "number"},
        {"key": "successes", "label": "Successes", "type": "number"},
        {"key": "prompt_level", "label": "Prompt level", "type": "select",
         "options": ["Independent", "Verbal", "Gestural", "Model", "Physical"]},
        {"key": "comment", "label": "Comment", "type": "text"}]}]},
    {"key": "summary", "label": "Summary", "fields": [
      {"key": "overall", "label": "Overall progress", "type": "textarea"},
      {"key": "home_program", "label": "Home program for parents", "type": "textarea"}]}
  ]}'::jsonb),
('Speech & Language Initial Assessment', 'assessment', 'speech', 1, '{
  "sections": [
    {"key": "history", "label": "Case history", "fields": [
      {"key": "concerns", "label": "Primary concerns", "type": "textarea"},
      {"key": "languages", "label": "Languages spoken at home", "type": "multiselect",
       "options": ["Tamil", "English", "Hindi", "Telugu", "Malayalam", "Other"]},
      {"key": "milestones", "label": "Speech milestones", "type": "textarea"}]},
    {"key": "receptive", "label": "Receptive language", "fields": [
      {"key": "follows_commands", "label": "Follows commands", "type": "select",
       "options": ["None", "1-step", "2-step", "Multi-step"]},
      {"key": "receptive_score", "label": "Receptive rating", "type": "scale", "min": 1, "max": 5}]},
    {"key": "expressive", "label": "Expressive language", "fields": [
      {"key": "mlu", "label": "Mean length of utterance", "type": "number"},
      {"key": "expressive_score", "label": "Expressive rating", "type": "scale", "min": 1, "max": 5}]},
    {"key": "articulation", "label": "Articulation, fluency, voice, oral motor", "fields": [
      {"key": "error_sounds", "label": "Error sounds", "type": "text"},
      {"key": "fluency", "label": "Fluency", "type": "textarea"},
      {"key": "oral_motor", "label": "Oral motor examination", "type": "textarea"}]},
    {"key": "impression", "label": "Impression", "fields": [
      {"key": "diagnosis", "label": "Provisional diagnosis", "type": "textarea"},
      {"key": "recommendation", "label": "Recommendations", "type": "textarea"}]}
  ]}'::jsonb),
('Occupational Therapy Initial Assessment', 'assessment', 'ot', 1, '{
  "sections": [
    {"key": "history", "label": "Background", "fields": [
      {"key": "concerns", "label": "Primary concerns", "type": "textarea"}]},
    {"key": "motor", "label": "Motor skills", "fields": [
      {"key": "fine_motor", "label": "Fine motor", "type": "scale", "min": 1, "max": 5},
      {"key": "gross_motor", "label": "Gross motor", "type": "scale", "min": 1, "max": 5},
      {"key": "grasp", "label": "Grasp pattern", "type": "text"}]},
    {"key": "sensory", "label": "Sensory processing", "fields": [
      {"key": "sensory_profile", "label": "Sensory profile", "type": "multiselect",
       "options": ["Tactile seeking", "Tactile avoiding", "Vestibular seeking", "Auditory sensitive", "Visual sensitive"]},
      {"key": "sensory_notes", "label": "Notes", "type": "textarea"}]},
    {"key": "adl", "label": "Activities of daily living", "fields": [
      {"key": "self_care", "label": "Self-care (feeding, dressing, toileting)", "type": "textarea"}]},
    {"key": "impression", "label": "Impression", "fields": [
      {"key": "summary", "label": "Summary", "type": "textarea"},
      {"key": "recommendation", "label": "Recommendations", "type": "textarea"}]}
  ]}'::jsonb),
('Physiotherapy Initial Assessment', 'assessment', 'physio', 1, '{
  "sections": [
    {"key": "history", "label": "History", "fields": [
      {"key": "complaint", "label": "Chief complaint", "type": "textarea"},
      {"key": "medical", "label": "Relevant medical history", "type": "textarea"}]},
    {"key": "examination", "label": "Examination", "fields": [
      {"key": "posture", "label": "Posture", "type": "textarea"},
      {"key": "tone", "label": "Muscle tone", "type": "select", "options": ["Normal", "Hypotonia", "Hypertonia", "Mixed"]},
      {"key": "rom", "label": "Range of motion", "type": "textarea"},
      {"key": "strength", "label": "Muscle strength", "type": "textarea"},
      {"key": "balance", "label": "Balance & gait", "type": "textarea"},
      {"key": "pain", "label": "Pain score", "type": "scale", "min": 0, "max": 10}]},
    {"key": "impression", "label": "Impression", "fields": [
      {"key": "summary", "label": "Summary", "type": "textarea"},
      {"key": "recommendation", "label": "Recommendations", "type": "textarea"}]}
  ]}'::jsonb),
('Progress Report', 'progress_report', null, 1, '{
  "sections": [
    {"key": "overview", "label": "Overview", "fields": [
      {"key": "attendance", "label": "Attendance summary", "type": "textarea"},
      {"key": "summary", "label": "Progress summary", "type": "textarea", "required": true}]},
    {"key": "goals", "label": "Goal status", "fields": [
      {"key": "goal_status", "label": "Goals", "type": "table", "columns": [
        {"key": "goal_id", "label": "Goal", "type": "goal_ref"},
        {"key": "status", "label": "Status", "type": "select", "options": ["Achieved", "Progressing", "Not yet"]},
        {"key": "comment", "label": "Comment", "type": "text"}]}]},
    {"key": "next", "label": "Recommendations", "fields": [
      {"key": "recommendations", "label": "Recommendations for next period", "type": "textarea"}]}
  ]}'::jsonb)
on conflict (name, version) do nothing;

-- ----------------------------------------------------------------------------
-- WhatsApp templates (provider_template_name must match the names approved
-- in WhatsApp Business Manager) and default reminder rules.
-- ----------------------------------------------------------------------------
insert into public.message_templates (name, purpose, provider_template_name, body_preview, variables) values
  ('Appointment reminder', 'appointment_reminder', 'appointment_reminder',
   'Dear {{parent_name}}, this is a reminder of {{student_name}}''s {{therapy}} session on {{date}} at {{time}} at {{branch}}.',
   '["parent_name","student_name","therapy","date","time","branch"]'),
  ('Appointment changed', 'appointment_change', 'appointment_change',
   'Dear {{parent_name}}, {{student_name}}''s session has been changed to {{date}} at {{time}}.',
   '["parent_name","student_name","date","time"]'),
  ('Payment reminder', 'payment_reminder', 'payment_reminder',
   'Dear {{parent_name}}, invoice {{invoice_no}} for {{student_name}} has a balance of {{amount}} due on {{due_date}}.',
   '["parent_name","student_name","invoice_no","amount","due_date"]'),
  ('Absence notice', 'absence_notice', 'absence_notice',
   'Dear {{parent_name}}, {{student_name}} was marked absent for the session on {{date}}.',
   '["parent_name","student_name","date"]'),
  ('Progress report ready', 'report_ready', 'report_ready',
   'Dear {{parent_name}}, the progress report for {{student_name}} is ready. Please contact {{branch}} to collect it.',
   '["parent_name","student_name","branch"]')
on conflict (name) do nothing;

insert into public.notification_schedules (branch_id, purpose, template_id, offset_minutes, repeat_every_days, max_repeats)
select null::uuid, 'appointment_reminder'::public.message_purpose, id, -1440, null::int, null::int
  from public.message_templates where name = 'Appointment reminder'
union all
select null::uuid, 'payment_reminder'::public.message_purpose, id, 4320, 7, 3        -- 3 days after due date, then weekly x3
  from public.message_templates where name = 'Payment reminder';
