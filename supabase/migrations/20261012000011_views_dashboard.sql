-- =============================================================================
-- Dashboard views. security_invoker = true => the caller's RLS applies, so an
-- admin sees only their branches and therapists see no revenue.
-- =============================================================================

-- Owner dashboard: revenue per branch per month (recorded payments).
create view public.v_branch_revenue_monthly
with (security_invoker = true) as
select
  p.branch_id,
  b.name                                  as branch_name,
  date_trunc('month', p.paid_at)::date    as month,
  sum(p.amount)                           as revenue,
  count(*)                                as payments_count,
  count(distinct p.student_id)            as paying_students
from public.payments p
join public.branches b on b.id = p.branch_id
where not p.is_void
group by p.branch_id, b.name, date_trunc('month', p.paid_at);

-- Outstanding dues + primary parent's WhatsApp number (for reminders).
create view public.v_outstanding_dues
with (security_invoker = true) as
select
  i.id                                    as invoice_id,
  i.invoice_no,
  i.branch_id,
  b.name                                  as branch_name,
  i.student_id,
  s.student_code,
  trim(s.first_name || ' ' || coalesce(s.last_name, '')) as student_name,
  i.issue_date,
  i.due_date,
  i.total,
  i.amount_paid,
  i.balance,
  i.status,
  greatest(current_date - i.due_date, 0)  as days_overdue,
  i.last_reminder_at,
  i.reminder_count,
  par.id                                  as parent_id,
  par.full_name                           as parent_name,
  par.whatsapp_number,
  par.whatsapp_opt_in
from public.invoices i
join public.branches b on b.id = i.branch_id
join public.students s on s.id = i.student_id
left join public.student_parents sp on sp.student_id = s.id and sp.is_primary_contact
left join public.parents par on par.id = sp.parent_id
where i.status in ('unpaid', 'partial')
  and i.balance > 0;

-- Branch-level dues totals for the owner dashboard.
create view public.v_branch_dues_summary
with (security_invoker = true) as
select
  i.branch_id,
  b.name                                                    as branch_name,
  count(*)                                                  as open_invoices,
  sum(i.balance)                                            as total_outstanding,
  sum(i.balance) filter (where i.due_date < current_date)   as overdue_amount
from public.invoices i
join public.branches b on b.id = i.branch_id
where i.status in ('unpaid', 'partial')
group by i.branch_id, b.name;

-- Therapist workload per month.
create view public.v_therapist_utilization
with (security_invoker = true) as
select
  a.therapist_id,
  pr.full_name                                                      as therapist_name,
  a.branch_id,
  date_trunc('month', a.start_at)::date                             as month,
  count(*)                                                          as total_appointments,
  count(*) filter (where a.status = 'completed')                    as completed,
  count(*) filter (where a.status = 'cancelled')                    as cancelled,
  count(*) filter (where a.status = 'no_show')                      as no_show,
  round(sum(extract(epoch from (a.end_at - a.start_at)) / 3600.0)
        filter (where a.status = 'completed'), 2)                   as completed_hours
from public.appointments a
join public.profiles pr on pr.id = a.therapist_id
group by a.therapist_id, pr.full_name, a.branch_id, date_trunc('month', a.start_at);

-- Student attendance per month.
create view public.v_attendance_summary
with (security_invoker = true) as
select
  sa.student_id,
  sa.branch_id,
  date_trunc('month', sa.attendance_date)::date        as month,
  count(*)                                             as total,
  count(*) filter (where sa.status = 'present')        as present,
  count(*) filter (where sa.status = 'late')           as late,
  count(*) filter (where sa.status = 'absent')         as absent,
  count(*) filter (where sa.status = 'excused')        as excused,
  round(100.0 * count(*) filter (where sa.status in ('present', 'late')) / nullif(count(*), 0), 1)
                                                       as attendance_pct
from public.student_attendance sa
group by sa.student_id, sa.branch_id, date_trunc('month', sa.attendance_date);

-- Student counts per branch.
create view public.v_students_by_branch
with (security_invoker = true) as
select
  b.id                                                                       as branch_id,
  b.name                                                                     as branch_name,
  count(s.id) filter (where s.status = 'active')                             as active_students,
  count(s.id) filter (where s.status = 'waitlist')                           as waitlist,
  count(s.id) filter (where s.status = 'on_hold')                            as on_hold,
  count(s.id) filter (where s.intake_date >= date_trunc('month', current_date)) as new_this_month
from public.branches b
left join public.students s on s.home_branch_id = b.id and s.deleted_at is null
where b.deleted_at is null
group by b.id, b.name;

-- Views are readable by signed-in users only (RLS still applies underneath).
revoke all on public.v_branch_revenue_monthly, public.v_outstanding_dues, public.v_branch_dues_summary,
              public.v_therapist_utilization, public.v_attendance_summary, public.v_students_by_branch
  from anon;
