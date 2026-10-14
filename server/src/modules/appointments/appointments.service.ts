import type { DbClient } from '../../lib/supabase.js';
import type { AuthUser } from '../../middleware/auth.js';
import { assertBranchManager } from '../../utils/access.js';
import { unwrap } from '../../utils/AppError.js';
import { eachDate, zonedToUtc } from '../../utils/time.js';
import type { CreateRecurringInput } from './appointments.schema.js';

type Skipped = { date: string; reason: 'holiday' | 'conflict' | 'error'; message?: string };

/**
 * Creates a recurrence group and expands it into individual appointments.
 * Runs as the user (RLS applies). Holidays are skipped; clashes with existing
 * bookings (exclusion constraint 23P01) are skipped and reported.
 */
export async function createRecurring(db: DbClient, user: AuthUser, input: CreateRecurringInput) {
  assertBranchManager(user, input.branch_id);

  const branch = unwrap(
    await db.from('branches').select('timezone').eq('id', input.branch_id).single(),
  ) as { timezone: string };

  const holidays = unwrap(
    await db
      .from('branch_holidays')
      .select('holiday_date')
      .eq('branch_id', input.branch_id)
      .gte('holiday_date', input.start_date)
      .lte('holiday_date', input.end_date),
  ) as { holiday_date: string }[];
  const holidaySet = new Set(holidays.map((h) => h.holiday_date));

  const group = unwrap(
    await db
      .from('recurrence_groups')
      .insert({
        branch_id: input.branch_id,
        student_id: input.student_id,
        therapist_id: input.therapist_id,
        therapy_type: input.therapy_type,
        weekdays: input.weekdays,
        start_time: input.start_time,
        duration_min: input.duration_min,
        start_date: input.start_date,
        end_date: input.end_date,
        created_by: user.id,
      })
      .select('id')
      .single(),
  ) as { id: string };

  let created = 0;
  const skipped: Skipped[] = [];

  for (const day of eachDate(input.start_date, input.end_date)) {
    if (!input.weekdays.includes(day.weekday)) continue;
    if (holidaySet.has(day.iso)) {
      skipped.push({ date: day.iso, reason: 'holiday' });
      continue;
    }
    const start = zonedToUtc(day.iso, input.start_time, branch.timezone);
    const end = new Date(start.getTime() + input.duration_min * 60_000);

    const { error } = await db.from('appointments').insert({
      branch_id: input.branch_id,
      student_id: input.student_id,
      therapist_id: input.therapist_id,
      room_id: input.room_id ?? null,
      therapy_type: input.therapy_type,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      recurrence_group_id: group.id,
      notes: input.notes ?? null,
      created_by: user.id,
    });
    if (!error) created++;
    else skipped.push({ date: day.iso, reason: error.code === '23P01' ? 'conflict' : 'error', message: error.message });
  }

  return { recurrence_group_id: group.id, created, skipped };
}

/** Cancels all future appointments of a series. */
export async function cancelSeries(db: DbClient, user: AuthUser, groupId: string, reason?: string) {
  const rows = unwrap(
    await db
      .from('appointments')
      .update({
        status: 'cancelled',
        cancel_reason: reason ?? 'Series cancelled',
        cancelled_by: user.id,
        cancelled_at: new Date().toISOString(),
      })
      .eq('recurrence_group_id', groupId)
      .in('status', ['scheduled', 'confirmed'])
      .gt('start_at', new Date().toISOString())
      .select('id'),
  ) as { id: string }[];
  return { cancelled: rows.length };
}
