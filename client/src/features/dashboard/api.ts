import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { addDays, zonedToUtc } from '@/lib/time';

const TZ = 'Asia/Kolkata';

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export interface Attention {
  leaveToday: { id: string; name: string; to_date: string }[];
  pendingLeave: number;
  /** Past sessions (2–30 days old) without a signed note, per therapist. */
  unsignedByTherapist: { therapist: string; count: number }[];
  /** Active patients with nothing booked from now on. */
  unbookedPatients: { id: string; name: string; code: string }[];
  plansDue: { id: string; title: string; student_id: string; student: string; review_date: string }[];
  draftReports: number;
}

/** Branch admin "needs attention" list. RLS keeps everything inside the admin's branches. */
export function useAttention(branchId: string | null, today: string) {
  return useQuery({
    queryKey: ['dashboard', 'attention', branchId, today],
    queryFn: async (): Promise<Attention> => {
      const now = new Date().toISOString();
      const twoDaysAgo = zonedToUtc(addDays(today, -2), '00:00', TZ).toISOString();
      const monthAgo = zonedToUtc(addDays(today, -30), '00:00', TZ).toISOString();
      const scope = <Q extends { eq: (c: string, v: string) => Q }>(q: Q, col = 'branch_id') => (branchId ? q.eq(col, branchId) : q);

      const [leaves, notes, students, upcoming, plans, reports] = await Promise.all([
        supabase
          .from('staff_leaves')
          .select('id, status, from_date, to_date, staff:profiles!staff_leaves_profile_id_fkey(full_name)')
          .in('status', ['pending', 'approved'])
          .gte('to_date', today),
        scope(
          supabase
            .from('appointments')
            .select('id, therapist:profiles!appointments_therapist_id_fkey(full_name), therapy_sessions(is_locked), student_attendance(status)')
            .in('status', ['scheduled', 'confirmed', 'completed'])
            .gte('start_at', monthAgo)
            .lt('start_at', twoDaysAgo),
        ),
        scope(
          supabase.from('students').select('id, first_name, last_name, student_code').eq('status', 'active').is('deleted_at', null),
          'home_branch_id',
        ),
        scope(
          supabase.from('appointments').select('student_id').in('status', ['scheduled', 'confirmed']).gte('start_at', now),
        ),
        scope(
          supabase
            .from('treatment_plans')
            .select('id, title, student_id, review_date, students(first_name, last_name)')
            .eq('status', 'active')
            .lte('review_date', today)
            .order('review_date'),
        ),
        scope(supabase.from('progress_reports').select('id', { count: 'exact', head: true }).eq('status', 'draft')),
      ]);
      for (const r of [leaves, notes, students, upcoming, plans, reports]) if (r.error) throw r.error;

      type LeaveRow = { id: string; status: string; from_date: string; to_date: string; staff: { full_name: string } | null };
      const leaveRows = (leaves.data ?? []) as unknown as LeaveRow[];

      type NoteRow = {
        therapist: { full_name: string } | null;
        therapy_sessions: { is_locked: boolean } | { is_locked: boolean }[] | null;
        student_attendance: { status: string } | { status: string }[] | null;
      };
      const unsigned = new Map<string, number>();
      for (const a of (notes.data ?? []) as unknown as NoteRow[]) {
        if (one(a.therapy_sessions)?.is_locked || one(a.student_attendance)?.status === 'absent') continue;
        const name = a.therapist?.full_name ?? 'Unknown';
        unsigned.set(name, (unsigned.get(name) ?? 0) + 1);
      }

      const booked = new Set((upcoming.data ?? []).map((a) => a.student_id));
      type PlanRow = { id: string; title: string; student_id: string; review_date: string; students: { first_name: string; last_name: string | null } | null };

      return {
        leaveToday: leaveRows
          .filter((l) => l.status === 'approved' && l.from_date <= today)
          .map((l) => ({ id: l.id, name: l.staff?.full_name ?? '', to_date: l.to_date })),
        pendingLeave: leaveRows.filter((l) => l.status === 'pending').length,
        unsignedByTherapist: [...unsigned].map(([therapist, count]) => ({ therapist, count })).sort((a, b) => b.count - a.count),
        unbookedPatients: (students.data ?? [])
          .filter((s) => !booked.has(s.id))
          .map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name ?? ''}`.trim(), code: s.student_code })),
        plansDue: ((plans.data ?? []) as unknown as PlanRow[]).map((p) => ({
          id: p.id,
          title: p.title,
          student_id: p.student_id,
          student: `${p.students?.first_name ?? ''} ${p.students?.last_name ?? ''}`.trim(),
          review_date: p.review_date,
        })),
        draftReports: reports.count ?? 0,
      };
    },
  });
}

export interface WeekAttendance {
  weekStart: string;
  attended: number;
  absent: number;
  pct: number | null;
}

export interface Trends {
  weeks: WeekAttendance[];
  workload: { therapist: string; completed: number }[];
  newPatients: number;
  activePatients: number;
}

/** Last 4 weeks of attendance + this month's completed sessions per therapist. */
export function useTrends(branchId: string | null, today: string) {
  return useQuery({
    queryKey: ['dashboard', 'trends', branchId, today],
    queryFn: async (): Promise<Trends> => {
      const start = addDays(today, -27);
      const monthStart = `${today.slice(0, 7)}-01`;
      const scope = <Q extends { eq: (c: string, v: string) => Q }>(q: Q, col = 'branch_id') => (branchId ? q.eq(col, branchId) : q);

      const [att, done, patients] = await Promise.all([
        scope(supabase.from('student_attendance').select('attendance_date, status').gte('attendance_date', start).lte('attendance_date', today)),
        scope(
          supabase
            .from('appointments')
            .select('therapist:profiles!appointments_therapist_id_fkey(full_name)')
            .eq('status', 'completed')
            .gte('start_at', zonedToUtc(monthStart, '00:00', TZ).toISOString()),
        ),
        scope(supabase.from('students').select('intake_date').eq('status', 'active').is('deleted_at', null), 'home_branch_id'),
      ]);
      for (const r of [att, done, patients]) if (r.error) throw r.error;

      const weeks: WeekAttendance[] = [0, 1, 2, 3].map((i) => {
        const ws = addDays(start, i * 7);
        const we = addDays(ws, 6);
        const rows = (att.data ?? []).filter((r) => r.attendance_date >= ws && r.attendance_date <= we);
        const attended = rows.filter((r) => r.status === 'present' || r.status === 'late').length;
        const absent = rows.filter((r) => r.status === 'absent').length;
        return { weekStart: ws, attended, absent, pct: rows.length ? Math.round((100 * attended) / rows.length) : null };
      });

      const counts = new Map<string, number>();
      for (const a of (done.data ?? []) as unknown as { therapist: { full_name: string } | null }[]) {
        const n = a.therapist?.full_name ?? 'Unknown';
        counts.set(n, (counts.get(n) ?? 0) + 1);
      }

      return {
        weeks,
        workload: [...counts].map(([therapist, completed]) => ({ therapist, completed })).sort((a, b) => b.completed - a.completed),
        newPatients: (patients.data ?? []).filter((p) => p.intake_date >= monthStart).length,
        activePatients: patients.data?.length ?? 0,
      };
    },
  });
}

export interface BranchRow {
  id: string;
  name: string;
  code: string;
  admins: string[];
  therapists: number;
  activePatients: number;
  sessionsDone: number;
  noShows: number;
  attendancePct: number | null;
}

/** Owner: one row per branch for this month. */
export function useBranchComparison(today: string) {
  return useQuery({
    queryKey: ['dashboard', 'branches', today],
    queryFn: async (): Promise<BranchRow[]> => {
      const monthStart = `${today.slice(0, 7)}-01`;
      const [branches, students, appts, att] = await Promise.all([
        supabase
          .from('branches')
          .select('id, name, code, staff_branches(profiles(full_name, role, is_active))')
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('name'),
        supabase.from('students').select('home_branch_id').eq('status', 'active').is('deleted_at', null),
        supabase
          .from('appointments')
          .select('branch_id, status')
          .gte('start_at', zonedToUtc(monthStart, '00:00', TZ).toISOString())
          .lt('start_at', new Date().toISOString())
          .limit(10000),
        supabase.from('student_attendance').select('branch_id, status').gte('attendance_date', monthStart).limit(10000),
      ]);
      for (const r of [branches, students, appts, att]) if (r.error) throw r.error;

      type B = { id: string; name: string; code: string; staff_branches: { profiles: { full_name: string; role: string; is_active: boolean } | null }[] };
      return ((branches.data ?? []) as unknown as B[]).map((b) => {
        const staff = b.staff_branches.map((s) => s.profiles).filter((p): p is NonNullable<typeof p> => !!p && p.is_active);
        const a = (appts.data ?? []).filter((x) => x.branch_id === b.id);
        const at = (att.data ?? []).filter((x) => x.branch_id === b.id);
        const attended = at.filter((x) => x.status === 'present' || x.status === 'late').length;
        return {
          id: b.id,
          name: b.name,
          code: b.code,
          admins: staff.filter((p) => p.role === 'admin').map((p) => p.full_name),
          therapists: staff.filter((p) => p.role === 'therapist').length,
          activePatients: (students.data ?? []).filter((s) => s.home_branch_id === b.id).length,
          sessionsDone: a.filter((x) => x.status === 'completed').length,
          noShows: a.filter((x) => x.status === 'no_show').length,
          attendancePct: at.length ? Math.round((100 * attended) / at.length) : null,
        };
      });
    },
  });
}
