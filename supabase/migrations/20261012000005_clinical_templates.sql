-- =============================================================================
-- Form templates, assessments, treatment plans, SMART goals
-- =============================================================================

-- Admin-defined forms. `schema` describes sections/fields; React renders it.
-- Never edit a template that has been used: insert a new version instead.
create table public.form_templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  kind          public.form_kind not null,
  therapy_type  public.therapy_type,          -- null = usable for all therapy types
  version       integer not null default 1,
  schema        jsonb not null,
  is_active     boolean not null default true,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (name, version)
);
create index form_templates_kind_idx on public.form_templates (kind, therapy_type) where is_active;
create index form_templates_created_by_idx on public.form_templates (created_by);

create table public.assessments (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.students(id) on delete cascade,
  branch_id         uuid not null references public.branches(id) on delete restrict,
  therapist_id      uuid not null references public.profiles(id) on delete restrict,
  template_id       uuid not null references public.form_templates(id) on delete restrict,
  template_version  integer not null,
  therapy_type      public.therapy_type not null,
  assessment_date   date not null default current_date,
  responses         jsonb not null default '{}'::jsonb,
  scores            jsonb,
  summary           text,
  recommendations   text,
  status            public.record_status not null default 'draft',
  finalized_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index assessments_student_idx   on public.assessments (student_id, assessment_date desc);
create index assessments_branch_idx    on public.assessments (branch_id, assessment_date);
create index assessments_therapist_idx on public.assessments (therapist_id);
create index assessments_template_idx  on public.assessments (template_id);

create table public.treatment_plans (
  id                   uuid primary key default gen_random_uuid(),
  student_id           uuid not null references public.students(id) on delete cascade,
  branch_id            uuid not null references public.branches(id) on delete restrict,
  therapist_id         uuid not null references public.profiles(id) on delete restrict,
  assessment_id        uuid references public.assessments(id) on delete set null,
  therapy_type         public.therapy_type not null,
  title                text not null,
  long_term_objective  text,
  start_date           date not null default current_date,
  review_date          date,
  end_date             date,
  status               public.plan_status not null default 'active',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index treatment_plans_student_idx    on public.treatment_plans (student_id, status);
create index treatment_plans_branch_idx     on public.treatment_plans (branch_id);
create index treatment_plans_therapist_idx  on public.treatment_plans (therapist_id);
create index treatment_plans_assessment_idx on public.treatment_plans (assessment_id);

-- SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound)
create table public.therapy_goals (
  id                   uuid primary key default gen_random_uuid(),
  plan_id              uuid not null references public.treatment_plans(id) on delete cascade,
  domain               text,                    -- e.g. 'Receptive language', 'Fine motor'
  description          text not null,
  specific             text,
  measurable_criteria  text,                    -- e.g. '80% accuracy over 3 sessions'
  achievable_notes     text,
  relevance            text,
  target_date          date,
  baseline_value       numeric,
  target_value         numeric,
  unit                 text,                    -- '%', 'trials', 'seconds' ...
  status               public.goal_status not null default 'active',
  achieved_at          date,
  sort_order           integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index therapy_goals_plan_idx on public.therapy_goals (plan_id, sort_order);
