import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormValues } from '@/features/forms/types';
import { supabase } from '@/lib/supabase';
import { dayRange } from '@/lib/time';
import type { Json, TablesUpdate } from '@/types/database.types';
import type { TherapyType } from '@/types/app';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';

/** PostgREST returns one-to-one embeds as an object, but be tolerant of arrays. */
function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export interface AgendaItem {
  id: string;
  branch_id: string;
  student_id: string;
  therapist_id: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  therapy_type: TherapyType;
  student: { first_name: string; last_name: string | null; student_code: string } | null;
  therapist: { full_name: string } | null;
  attendance: { status: AttendanceStatus } | null;
  session: { id: string; is_locked: boolean } | null;
}

const AGENDA_SELECT =
  'id, branch_id, student_id, therapist_id, start_at, end_at, status, therapy_type, students(first_name, last_name, student_code), therapist:profiles!appointments_therapist_id_fkey(full_name), student_attendance(status), therapy_sessions(id, is_locked)';

type AgendaRaw = Omit<AgendaItem, 'student' | 'attendance' | 'session'> & {
  students: AgendaItem['student'];
  student_attendance: AgendaItem['attendance'] | AgendaItem['attendance'][];
  therapy_sessions: AgendaItem['session'] | AgendaItem['session'][];
};

function toAgenda(rows: AgendaRaw[]): AgendaItem[] {
  return rows.map(({ students, student_attendance, therapy_sessions, ...a }) => ({
    ...a,
    student: students,
    attendance: one(student_attendance),
    session: one(therapy_sessions),
  }));
}

/** Appointments of one day with attendance + note state. RLS limits therapists to their own. */
export function useAgenda(opts: { date: string; timeZone: string; branchId: string | null; therapistId?: string }) {
  return useQuery({
    queryKey: ['agenda', opts],
    queryFn: async () => {
      const { from, to } = dayRange(opts.date, opts.timeZone);
      let q = supabase.from('appointments').select(AGENDA_SELECT).gte('start_at', from).lt('start_at', to).order('start_at');
      if (opts.branchId) q = q.eq('branch_id', opts.branchId);
      if (opts.therapistId) q = q.eq('therapist_id', opts.therapistId);
      const { data, error } = await q;
      if (error) throw error;
      return toAgenda(data as unknown as AgendaRaw[]);
    },
  });
}

/** Past sessions (last 30 days) that still need a signed note. */
export function usePendingNotes(therapistId: string | undefined) {
  return useQuery({
    queryKey: ['agenda', 'pending-notes', therapistId],
    enabled: !!therapistId,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from('appointments')
        .select(AGENDA_SELECT)
        .eq('therapist_id', therapistId!)
        .in('status', ['scheduled', 'confirmed', 'completed'])
        .gte('start_at', since)
        .lt('start_at', new Date().toISOString())
        .order('start_at', { ascending: false });
      if (error) throw error;
      return toAgenda(data as unknown as AgendaRaw[]).filter((a) => !a.session?.is_locked && a.attendance?.status !== 'absent');
    },
  });
}

function invalidateAgenda(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['agenda'] });
  qc.invalidateQueries({ queryKey: ['appointments'] });
  qc.invalidateQueries({ queryKey: ['sessions'] });
}

/** Check-in: records attendance; absent also marks the appointment as no-show. */
export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ item, status, date }: { item: AgendaItem; status: AttendanceStatus; date: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from('student_attendance').upsert(
        {
          appointment_id: item.id,
          student_id: item.student_id,
          branch_id: item.branch_id,
          attendance_date: date,
          status,
          arrived_at: status === 'present' || status === 'late' ? new Date().toISOString() : null,
          marked_by: auth.user?.id ?? null,
        },
        { onConflict: 'appointment_id' },
      );
      if (error) throw error;

      let next: AppointmentStatus | null = null;
      if (status === 'absent' && item.status !== 'no_show') next = 'no_show';
      if (status !== 'absent' && item.status === 'no_show') next = 'confirmed';
      if (next) {
        const { error: aErr } = await supabase.from('appointments').update({ status: next }).eq('id', item.id);
        if (aErr) throw aErr;
      }
    },
    onSuccess: () => invalidateAgenda(qc),
  });
}

export interface SessionRecord {
  id: string;
  appointment_id: string | null;
  plan_id: string | null;
  note_format: 'soap' | 'smart';
  template_id: string | null;
  notes: FormValues & { goal_results?: GoalResult[] };
  activities: string | null;
  home_program: string | null;
  parent_feedback: string | null;
  next_session_plan: string | null;
  is_locked: boolean;
  signed_at: string | null;
  updated_at: string;
}

export interface GoalResult {
  goal_id: string;
  trials?: number | null;
  successes?: number | null;
  prompt_level?: string | null;
  comment?: string | null;
}

export interface NoteContext {
  appointment: AgendaItem & { branch: { name: string; timezone: string } | null };
  session: SessionRecord | null;
}

const SESSION_SELECT =
  'id, appointment_id, plan_id, note_format, template_id, notes, activities, home_program, parent_feedback, next_session_plan, is_locked, signed_at, updated_at';

/** Appointment + its session note (if started). */
export function useNoteContext(appointmentId: string | undefined) {
  return useQuery({
    queryKey: ['sessions', 'note', appointmentId],
    enabled: !!appointmentId,
    queryFn: async (): Promise<NoteContext> => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`${AGENDA_SELECT}, branch:branches(name, timezone)`)
        .eq('id', appointmentId!)
        .single();
      if (error) throw error;
      const raw = data as unknown as AgendaRaw & { branch: { name: string; timezone: string } | null };
      const [appointment] = toAgenda([raw]);

      const { data: session, error: sErr } = await supabase
        .from('therapy_sessions')
        .select(SESSION_SELECT)
        .eq('appointment_id', appointmentId!)
        .maybeSingle();
      if (sErr) throw sErr;
      return { appointment: { ...appointment, branch: raw.branch }, session: session as unknown as SessionRecord | null };
    },
  });
}

export interface SaveNoteInput {
  context: NoteContext;
  template_id: string | null;
  plan_id: string | null;
  notes: FormValues;
  goal_results: GoalResult[];
  activities: string;
  home_program: string;
  parent_feedback: string;
  next_session_plan: string;
  sign: boolean;
}

/**
 * Saves the note as a draft or signs it. Signing locks the note (only the owner can
 * change it afterwards), completes the appointment and records goal progress.
 */
export function useSaveNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveNoteInput) => {
      const { appointment, session } = input.context;
      const durationMin = Math.round((Date.parse(appointment.end_at) - Date.parse(appointment.start_at)) / 60_000);
      const tz = appointment.branch?.timezone ?? 'Asia/Kolkata';
      const row = {
        appointment_id: appointment.id,
        student_id: appointment.student_id,
        therapist_id: appointment.therapist_id,
        branch_id: appointment.branch_id,
        therapy_type: appointment.therapy_type,
        session_date: new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(appointment.start_at)),
        start_at: appointment.start_at,
        duration_min: durationMin > 0 ? durationMin : null,
        note_format: input.goal_results.length ? ('smart' as const) : ('soap' as const),
        template_id: input.template_id,
        plan_id: input.plan_id,
        notes: { ...input.notes, goal_results: input.goal_results } as unknown as Json,
        activities: input.activities || null,
        home_program: input.home_program || null,
        parent_feedback: input.parent_feedback || null,
        next_session_plan: input.next_session_plan || null,
      };

      let sessionId = session?.id;
      if (sessionId) {
        const patch: TablesUpdate<'therapy_sessions'> = { ...row, is_locked: input.sign };
        const { error } = await supabase.from('therapy_sessions').update(patch).eq('id', sessionId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('therapy_sessions')
          .insert({ ...row, is_locked: input.sign })
          .select('id')
          .single();
        if (error) throw error;
        sessionId = data.id;
      }

      // Goal progress mirrors the note: replace this session's points.
      const { error: delErr } = await supabase.from('goal_progress').delete().eq('session_id', sessionId);
      if (delErr) throw delErr;
      const points = input.goal_results.filter((g) => g.trials || g.successes || g.prompt_level || g.comment);
      if (points.length) {
        const { data: auth } = await supabase.auth.getUser();
        const { error: gErr } = await supabase.from('goal_progress').insert(
          points.map((g) => ({
            goal_id: g.goal_id,
            session_id: sessionId,
            trials: g.trials ?? null,
            successes: g.successes ?? null,
            prompt_level: g.prompt_level ?? null,
            note: g.comment ?? null,
            recorded_by: auth.user?.id ?? null,
            recorded_at: appointment.start_at,
          })),
        );
        if (gErr) throw gErr;
      }

      if (input.sign && appointment.status !== 'completed') {
        const { error } = await supabase.from('appointments').update({ status: 'completed' }).eq('id', appointment.id);
        if (error) throw error;
      }
      return sessionId;
    },
    onSuccess: () => {
      invalidateAgenda(qc);
      qc.invalidateQueries({ queryKey: ['goal-progress'] });
    },
  });
}

export interface SessionListItem {
  id: string;
  appointment_id: string | null;
  session_date: string;
  therapy_type: TherapyType;
  is_locked: boolean;
  signed_at: string | null;
  updated_at: string;
  students: { id: string; first_name: string; last_name: string | null; student_code: string } | null;
  therapist: { full_name: string } | null;
}

/** Session notes (latest first). RLS: therapists see their own + assigned patients'. */
export function useSessionList(opts: { branchId: string | null; studentId?: string; status: 'all' | 'draft' | 'signed' }) {
  return useQuery({
    queryKey: ['sessions', 'list', opts],
    queryFn: async () => {
      let q = supabase
        .from('therapy_sessions')
        .select(
          'id, appointment_id, session_date, therapy_type, is_locked, signed_at, updated_at, students(id, first_name, last_name, student_code), therapist:profiles!therapy_sessions_therapist_id_fkey(full_name)',
        )
        .order('session_date', { ascending: false })
        .limit(200);
      if (opts.branchId) q = q.eq('branch_id', opts.branchId);
      if (opts.studentId) q = q.eq('student_id', opts.studentId);
      if (opts.status !== 'all') q = q.eq('is_locked', opts.status === 'signed');
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as SessionListItem[];
    },
  });
}
