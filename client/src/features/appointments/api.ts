import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { dayRange, zonedToUtc } from '@/lib/time';
import type { TablesUpdate } from '@/types/database.types';
import type { TherapyType } from '@/types/app';

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';

export interface AppointmentRow {
  id: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  therapy_type: TherapyType;
  notes: string | null;
  recurrence_group_id: string | null;
  students: { first_name: string; last_name: string | null; student_code: string } | null;
  therapist: { full_name: string } | null;
  branches: { name: string } | null;
}

/** One day of appointments. RLS: admins see their branches, therapists only their own. */
export function useAppointments(opts: { branchId: string | null; date: string; timeZone: string }) {
  return useQuery({
    queryKey: ['appointments', opts],
    queryFn: async () => {
      const { from, to } = dayRange(opts.date, opts.timeZone);
      let q = supabase
        .from('appointments')
        .select(
          'id, start_at, end_at, status, therapy_type, notes, recurrence_group_id, students(first_name, last_name, student_code), therapist:profiles!appointments_therapist_id_fkey(full_name), branches(name)',
        )
        .gte('start_at', from)
        .lt('start_at', to)
        .order('start_at');
      if (opts.branchId) q = q.eq('branch_id', opts.branchId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as AppointmentRow[];
    },
  });
}

export interface BookingInput {
  branch_id: string;
  time_zone: string;
  student_id: string;
  therapist_id: string;
  therapy_type: TherapyType;
  date: string;
  start_time: string;
  duration_min: number;
  notes?: string;
  /** Weekly repeat: weekdays (0 = Sunday) until `until` (inclusive). */
  repeat?: { weekdays: number[]; until: string };
}

export type BookingResult =
  | { kind: 'single' }
  | { kind: 'series'; created: number; skipped: { date: string; reason: string }[] };

/** Puts the therapist on the patient's care team so they can see the patient's records. */
async function ensureCareTeam(input: BookingInput) {
  const { data, error } = await supabase
    .from('student_therapists')
    .select('id')
    .eq('student_id', input.student_id)
    .eq('therapist_id', input.therapist_id)
    .eq('therapy_type', input.therapy_type)
    .is('end_date', null)
    .maybeSingle();
  if (error) throw error;
  if (data) return;
  const { error: insErr } = await supabase.from('student_therapists').insert({
    student_id: input.student_id,
    therapist_id: input.therapist_id,
    branch_id: input.branch_id,
    therapy_type: input.therapy_type,
  });
  if (insErr) throw insErr;
}

function bookingError(err: { code?: string; message: string }) {
  if (err.code === '23P01') return new Error('The therapist or patient already has an appointment at that time');
  return new Error(err.message);
}

/** Branch admin books one appointment (direct insert) or a weekly series (Express). */
export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BookingInput): Promise<BookingResult> => {
      await ensureCareTeam(input);

      if (input.repeat) {
        const res = await api.post<{ created: number; skipped: { date: string; reason: string }[] }>(
          '/appointments/recurring',
          {
            branch_id: input.branch_id,
            student_id: input.student_id,
            therapist_id: input.therapist_id,
            therapy_type: input.therapy_type,
            weekdays: input.repeat.weekdays,
            start_time: input.start_time,
            duration_min: input.duration_min,
            start_date: input.date,
            end_date: input.repeat.until,
            notes: input.notes,
          },
        );
        return { kind: 'series', created: res.created, skipped: res.skipped };
      }

      const start = zonedToUtc(input.date, input.start_time, input.time_zone);
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from('appointments').insert({
        branch_id: input.branch_id,
        student_id: input.student_id,
        therapist_id: input.therapist_id,
        therapy_type: input.therapy_type,
        start_at: start.toISOString(),
        end_at: new Date(start.getTime() + input.duration_min * 60_000).toISOString(),
        notes: input.notes ?? null,
        created_by: auth.user?.id,
      });
      if (error) throw bookingError(error);
      return { kind: 'single' };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });
}

export function useSetAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: AppointmentStatus; reason?: string }) => {
      let patch: TablesUpdate<'appointments'> = { status };
      if (status === 'cancelled') {
        const { data: auth } = await supabase.auth.getUser();
        patch = { ...patch, cancel_reason: reason ?? null, cancelled_by: auth.user?.id ?? null, cancelled_at: new Date().toISOString() };
      }
      const { error } = await supabase.from('appointments').update(patch).eq('id', id);
      if (error) throw bookingError(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });
}
