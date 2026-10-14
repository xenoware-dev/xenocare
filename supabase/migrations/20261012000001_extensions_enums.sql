-- =============================================================================
-- XenoCare / vSchool : extensions, schemas, enums, shared functions
-- =============================================================================

create extension if not exists btree_gist with schema extensions;  -- exclusion constraints (no double booking)
create extension if not exists citext     with schema extensions;  -- case-insensitive emails
create extension if not exists pg_trgm    with schema extensions;  -- fuzzy name search

-- Internal helpers (RLS helpers, audit trigger). Not exposed through the API.
create schema if not exists private;
grant usage on schema private to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type public.app_role           as enum ('owner', 'admin', 'therapist');
create type public.therapy_type       as enum ('speech', 'ot', 'physio', 'other');
create type public.gender             as enum ('male', 'female', 'other', 'unspecified');
create type public.student_status     as enum ('active', 'on_hold', 'discharged', 'waitlist');
create type public.appointment_status as enum ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled');
create type public.attendance_status  as enum ('present', 'absent', 'late', 'excused');
create type public.note_format        as enum ('soap', 'smart');
create type public.form_kind          as enum ('assessment', 'soap', 'smart', 'progress_report');
create type public.record_status      as enum ('draft', 'final');
create type public.plan_status        as enum ('active', 'completed', 'on_hold', 'discontinued');
create type public.goal_status        as enum ('active', 'achieved', 'discontinued', 'on_hold');
create type public.leave_status       as enum ('pending', 'approved', 'rejected', 'cancelled');
create type public.billing_unit       as enum ('per_session', 'monthly', 'package');
create type public.invoice_status     as enum ('unpaid', 'partial', 'paid', 'void');
create type public.payment_method     as enum ('cash', 'upi', 'bank_transfer', 'card', 'cheque', 'online', 'other');
create type public.message_purpose    as enum ('appointment_reminder', 'appointment_change', 'payment_reminder', 'absence_notice', 'report_ready', 'general');
create type public.msg_status         as enum ('queued', 'sent', 'delivered', 'read', 'failed');

-- ----------------------------------------------------------------------------
-- updated_at trigger function (attached to every table in a later migration)
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
