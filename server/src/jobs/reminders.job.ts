import { logger } from '../lib/logger.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { unwrap } from '../utils/AppError.js';
import { formatInZone } from '../utils/time.js';
import { sendPaymentReminder, type InvoiceForReminder } from '../modules/billing/billing.service.js';
import { notifyParents } from '../modules/whatsapp/whatsapp.service.js';

const THERAPY_LABEL: Record<string, string> = { speech: 'speech therapy', ot: 'occupational therapy', physio: 'physiotherapy', other: 'therapy' };

interface Schedule {
  branch_id: string | null;
  offset_minutes: number;
  repeat_every_days: number | null;
  max_repeats: number | null;
}

async function activeSchedules(purpose: 'appointment_reminder' | 'payment_reminder') {
  return unwrap(
    await supabaseAdmin
      .from('notification_schedules')
      .select('branch_id, offset_minutes, repeat_every_days, max_repeats')
      .eq('purpose', purpose)
      .eq('is_active', true),
  ) as Schedule[];
}

/** Reminds parents of upcoming appointments (e.g. 24 h before, offset -1440). */
export async function runAppointmentReminders() {
  let count = 0;
  for (const s of await activeSchedules('appointment_reminder')) {
    const now = new Date();
    const until = new Date(now.getTime() + Math.abs(s.offset_minutes) * 60_000);

    let q = supabaseAdmin
      .from('appointments')
      .select('id, branch_id, student_id, therapy_type, start_at, students(first_name), branches(name, timezone)')
      .in('status', ['scheduled', 'confirmed'])
      .is('reminder_sent_at', null)
      .gt('start_at', now.toISOString())
      .lte('start_at', until.toISOString())
      .limit(200);
    if (s.branch_id) q = q.eq('branch_id', s.branch_id);

    const rows = unwrap(await q) as unknown as {
      id: string;
      branch_id: string;
      student_id: string;
      therapy_type: string;
      start_at: string;
      students: { first_name: string };
      branches: { name: string; timezone: string };
    }[];

    for (const a of rows) {
      const { date, time } = formatInZone(a.start_at, a.branches.timezone);
      await notifyParents({
        branchId: a.branch_id,
        studentId: a.student_id,
        purpose: 'appointment_reminder',
        relatedType: 'appointment',
        relatedId: a.id,
        variables: {
          student_name: a.students.first_name,
          therapy: THERAPY_LABEL[a.therapy_type] ?? 'therapy',
          date,
          time,
          branch: a.branches.name,
        },
      });
      // Mark as reminded even when no parent is reachable, to avoid retrying every run.
      await supabaseAdmin.from('appointments').update({ reminder_sent_at: new Date().toISOString() }).eq('id', a.id);
      count++;
    }
  }
  return count;
}

/** Reminds parents of overdue invoices (offset = minutes after due date, repeated). */
export async function runPaymentReminders() {
  let count = 0;
  for (const s of await activeSchedules('payment_reminder')) {
    const dueBefore = new Date(Date.now() - s.offset_minutes * 60_000).toISOString().slice(0, 10);
    const maxReminders = s.max_repeats ?? 1;

    let q = supabaseAdmin
      .from('invoices')
      .select('id, invoice_no, branch_id, student_id, balance, due_date, status, reminder_count, last_reminder_at, students(first_name, last_name)')
      .in('status', ['unpaid', 'partial'])
      .gt('balance', 0)
      .lte('due_date', dueBefore)
      .lt('reminder_count', maxReminders)
      .limit(200);
    if (s.branch_id) q = q.eq('branch_id', s.branch_id);

    const rows = unwrap(await q) as unknown as (InvoiceForReminder & { last_reminder_at: string | null })[];
    const repeatMs = (s.repeat_every_days ?? 7) * 86_400_000;

    for (const inv of rows) {
      if (inv.last_reminder_at && Date.now() - Date.parse(inv.last_reminder_at) < repeatMs) continue;
      try {
        await sendPaymentReminder(inv, null);
        count++;
      } catch (err) {
        logger.warn({ err, invoiceId: inv.id }, 'Payment reminder skipped');
      }
    }
  }
  return count;
}
