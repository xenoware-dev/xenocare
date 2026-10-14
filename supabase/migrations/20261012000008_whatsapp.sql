-- =============================================================================
-- WhatsApp messaging (parents have no login; all contact is via WhatsApp API).
-- Express (service role) sends messages and updates status from the webhook.
-- =============================================================================

create table public.message_templates (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null unique,
  purpose                 public.message_purpose not null,
  provider_template_name  text not null,      -- approved template name in WhatsApp Business
  language                text not null default 'en',
  body_preview            text,               -- text shown in the admin UI
  variables               jsonb not null default '[]'::jsonb,  -- ["parent_name","student_name","date"]
  is_active               boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table public.whatsapp_messages (
  id                   uuid primary key default gen_random_uuid(),
  branch_id            uuid not null references public.branches(id) on delete restrict,
  parent_id            uuid references public.parents(id) on delete set null,
  student_id           uuid references public.students(id) on delete set null,
  to_number            text not null,
  template_id          uuid references public.message_templates(id) on delete set null,
  purpose              public.message_purpose not null,
  related_type         text check (related_type in ('appointment', 'invoice', 'progress_report', 'attendance', 'other')),
  related_id           uuid,
  payload              jsonb not null default '{}'::jsonb,   -- variables actually sent
  status               public.msg_status not null default 'queued',
  provider_message_id  text unique,
  error_message        text,
  sent_by              uuid references public.profiles(id) on delete set null,   -- null = automatic
  queued_at            timestamptz not null default now(),
  sent_at              timestamptz,
  delivered_at         timestamptz,
  read_at              timestamptz,
  failed_at            timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index whatsapp_messages_branch_idx   on public.whatsapp_messages (branch_id, queued_at desc);
create index whatsapp_messages_status_idx   on public.whatsapp_messages (status) where status in ('queued', 'failed');
create index whatsapp_messages_related_idx  on public.whatsapp_messages (related_type, related_id);
create index whatsapp_messages_parent_idx   on public.whatsapp_messages (parent_id);
create index whatsapp_messages_student_idx  on public.whatsapp_messages (student_id);
create index whatsapp_messages_template_idx on public.whatsapp_messages (template_id);
create index whatsapp_messages_sent_by_idx  on public.whatsapp_messages (sent_by);

-- Automatic reminder rules, run by a cron job in Express.
-- offset_minutes: negative = before the event (appointment start / invoice due date).
create table public.notification_schedules (
  id              uuid primary key default gen_random_uuid(),
  branch_id       uuid references public.branches(id) on delete cascade,   -- null = all branches
  purpose         public.message_purpose not null,
  template_id     uuid not null references public.message_templates(id) on delete cascade,
  offset_minutes  integer not null,
  repeat_every_days integer check (repeat_every_days > 0),               -- e.g. overdue reminders
  max_repeats     integer check (max_repeats > 0),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index notification_schedules_branch_idx   on public.notification_schedules (branch_id);
create index notification_schedules_template_idx on public.notification_schedules (template_id);
