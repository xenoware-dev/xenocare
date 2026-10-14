-- =============================================================================
-- Billing: manual fee & payment records only (no online payment gateway).
-- Admins record payments; reminders go to parents via WhatsApp; the owner
-- dashboard reads branch revenue from public.payments.
-- =============================================================================

create table public.fee_plans (
  id              uuid primary key default gen_random_uuid(),
  branch_id       uuid not null references public.branches(id) on delete cascade,
  name            text not null,
  therapy_type    public.therapy_type,
  billing_unit    public.billing_unit not null,
  amount          numeric(12,2) not null check (amount >= 0),
  sessions_count  integer check (sessions_count > 0),   -- for packages
  validity_days   integer check (validity_days > 0),    -- for packages
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (branch_id, name),
  check (billing_unit <> 'package' or sessions_count is not null)
);

create table public.student_fee_assignments (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.students(id) on delete cascade,
  branch_id         uuid not null references public.branches(id) on delete cascade,
  fee_plan_id       uuid not null references public.fee_plans(id) on delete restrict,
  custom_amount     numeric(12,2) check (custom_amount >= 0),
  discount_percent  numeric(5,2) not null default 0 check (discount_percent between 0 and 100),
  start_date        date not null default current_date,
  end_date          date,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);
create index student_fee_assignments_student_idx on public.student_fee_assignments (student_id);
create index student_fee_assignments_branch_idx  on public.student_fee_assignments (branch_id);
create index student_fee_assignments_plan_idx    on public.student_fee_assignments (fee_plan_id);

-- Per-branch, per-year invoice counter (e.g. GDV-2026-00042).
create table public.invoice_counters (
  branch_id  uuid not null references public.branches(id) on delete cascade,
  year       integer not null,
  last_no    integer not null,
  primary key (branch_id, year)
);

create table public.invoices (
  id                uuid primary key default gen_random_uuid(),
  branch_id         uuid not null references public.branches(id) on delete restrict,
  student_id        uuid not null references public.students(id) on delete restrict,
  invoice_no        text not null,
  issue_date        date not null default current_date,
  due_date          date,
  period_start      date,
  period_end        date,
  subtotal          numeric(12,2) not null default 0,   -- maintained from invoice_items
  discount          numeric(12,2) not null default 0 check (discount >= 0),
  total             numeric(12,2) generated always as (subtotal - discount) stored,
  amount_paid       numeric(12,2) not null default 0,   -- maintained from payments
  balance           numeric(12,2) generated always as (subtotal - discount - amount_paid) stored,
  status            public.invoice_status not null default 'unpaid',
  notes             text,
  last_reminder_at  timestamptz,
  reminder_count    integer not null default 0,
  voided_at         timestamptz,
  void_reason       text,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (branch_id, invoice_no)
);
create index invoices_branch_status_idx on public.invoices (branch_id, status, due_date);
create index invoices_student_idx       on public.invoices (student_id, issue_date desc);
create index invoices_created_by_idx    on public.invoices (created_by);

create or replace function public.assign_invoice_no()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year int := extract(year from new.issue_date)::int;
  v_no   int;
  v_code text;
begin
  if new.invoice_no is not null then
    return new;
  end if;

  insert into public.invoice_counters (branch_id, year, last_no)
  values (new.branch_id, v_year, 1)
  on conflict (branch_id, year)
    do update set last_no = public.invoice_counters.last_no + 1
  returning last_no into v_no;

  select code into v_code from public.branches where id = new.branch_id;
  new.invoice_no := v_code || '-' || v_year || '-' || lpad(v_no::text, 5, '0');
  return new;
end;
$$;

create trigger invoices_assign_no
  before insert on public.invoices
  for each row execute function public.assign_invoice_no();

create table public.invoice_items (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references public.invoices(id) on delete cascade,
  description  text not null,
  session_id   uuid references public.therapy_sessions(id) on delete set null,
  fee_plan_id  uuid references public.fee_plans(id) on delete set null,
  quantity     numeric(10,2) not null default 1 check (quantity > 0),
  unit_price   numeric(12,2) not null check (unit_price >= 0),
  amount       numeric(12,2) generated always as (quantity * unit_price) stored,
  created_at   timestamptz not null default now()
);
create index invoice_items_invoice_idx  on public.invoice_items (invoice_id);
create index invoice_items_session_idx  on public.invoice_items (session_id);
create index invoice_items_fee_plan_idx on public.invoice_items (fee_plan_id);

create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  invoice_id    uuid not null references public.invoices(id) on delete restrict,
  branch_id     uuid not null references public.branches(id) on delete restrict,   -- copied from invoice
  student_id    uuid not null references public.students(id) on delete restrict,   -- copied from invoice
  amount        numeric(12,2) not null check (amount > 0),
  method        public.payment_method not null default 'cash',
  paid_at       timestamptz not null default now(),
  reference_no  text,
  notes         text,
  received_by   uuid references public.profiles(id) on delete set null,
  is_void       boolean not null default false,
  voided_at     timestamptz,
  void_reason   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index payments_branch_paid_idx on public.payments (branch_id, paid_at) where not is_void;
create index payments_invoice_idx     on public.payments (invoice_id);
create index payments_student_idx     on public.payments (student_id);
create index payments_received_by_idx on public.payments (received_by);

-- Payment always inherits branch/student from its invoice.
create or replace function public.payment_fill_from_invoice()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select i.branch_id, i.student_id
    into new.branch_id, new.student_id
    from public.invoices i
   where i.id = new.invoice_id;
  return new;
end;
$$;

create trigger payments_fill_from_invoice
  before insert or update of invoice_id on public.payments
  for each row execute function public.payment_fill_from_invoice();

-- Recompute subtotal, amount_paid and status of one invoice.
create or replace function public.refresh_invoice(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.invoices i
     set subtotal    = coalesce((select sum(ii.amount) from public.invoice_items ii where ii.invoice_id = i.id), 0),
         amount_paid = coalesce((select sum(p.amount) from public.payments p where p.invoice_id = i.id and not p.is_void), 0)
   where i.id = p_invoice_id;

  update public.invoices i
     set status = case
                    when i.status = 'void'                       then 'void'::public.invoice_status
                    when i.total > 0 and i.amount_paid >= i.total then 'paid'::public.invoice_status
                    when i.amount_paid > 0                        then 'partial'::public.invoice_status
                    else 'unpaid'::public.invoice_status
                  end
   where i.id = p_invoice_id;
end;
$$;
revoke execute on function public.refresh_invoice(uuid) from public, anon, authenticated;

create or replace function public.on_invoice_child_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_invoice(old.invoice_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_invoice(new.invoice_id);
  end if;
  return null;
end;
$$;

create trigger invoice_items_refresh
  after insert or update or delete on public.invoice_items
  for each row execute function public.on_invoice_child_change();

create trigger payments_refresh
  after insert or update or delete on public.payments
  for each row execute function public.on_invoice_child_change();

-- Recalculate totals/status when the discount changes.
-- (To void: set status = 'void'. To un-void: set status = 'unpaid' then call
--  refresh_invoice() from Express.)
create or replace function public.on_invoice_amounts_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_invoice(new.id);
  return null;
end;
$$;

create trigger invoices_refresh_on_discount
  after update of discount on public.invoices
  for each row
  when (old.discount is distinct from new.discount)
  execute function public.on_invoice_amounts_change();
