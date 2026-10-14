import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormValues } from '@/features/forms/types';
import { progressValue, type Goal } from '@/features/plans/api';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/database.types';
import type { TherapyType } from '@/types/app';

export interface ReportListItem {
  id: string;
  period_start: string;
  period_end: string;
  therapy_type: TherapyType;
  status: 'draft' | 'final';
  shared_via_whatsapp_at: string | null;
  students: { id: string; first_name: string; last_name: string | null; student_code: string } | null;
  therapist: { full_name: string } | null;
}

export function useReports(opts: { branchId: string | null; studentId?: string }) {
  return useQuery({
    queryKey: ['reports', opts],
    queryFn: async () => {
      let q = supabase
        .from('progress_reports')
        .select(
          'id, period_start, period_end, therapy_type, status, shared_via_whatsapp_at, students(id, first_name, last_name, student_code), therapist:profiles!progress_reports_therapist_id_fkey(full_name)',
        )
        .order('period_end', { ascending: false })
        .limit(200);
      if (opts.branchId) q = q.eq('branch_id', opts.branchId);
      if (opts.studentId) q = q.eq('student_id', opts.studentId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as ReportListItem[];
    },
  });
}

export interface Report {
  id: string;
  student_id: string;
  branch_id: string;
  therapist_id: string;
  template_id: string | null;
  therapy_type: TherapyType;
  period_start: string;
  period_end: string;
  content: FormValues;
  summary: string | null;
  status: 'draft' | 'final';
  finalized_at: string | null;
  shared_via_whatsapp_at: string | null;
  students: { first_name: string; last_name: string | null; student_code: string; date_of_birth: string | null } | null;
  therapist: { full_name: string } | null;
  branches: { name: string; address: string | null; phone: string | null } | null;
}

export function useReport(id: string | undefined) {
  return useQuery({
    queryKey: ['report', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progress_reports')
        .select(
          'id, student_id, branch_id, therapist_id, template_id, therapy_type, period_start, period_end, content, summary, status, finalized_at, shared_via_whatsapp_at, students(first_name, last_name, student_code, date_of_birth), therapist:profiles!progress_reports_therapist_id_fkey(full_name), branches(name, address, phone)',
        )
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as unknown as Report;
    },
  });
}

export interface SaveReportInput {
  id?: string;
  student_id: string;
  branch_id: string;
  therapist_id: string;
  template_id: string;
  therapy_type: TherapyType;
  period_start: string;
  period_end: string;
  content: FormValues;
  finalize: boolean;
}

export function useSaveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, finalize, ...input }: SaveReportInput) => {
      const overview = (input.content.overview ?? {}) as Record<string, string>;
      const row = {
        ...input,
        content: input.content as unknown as Json,
        summary: overview.summary || null,
        status: finalize ? ('final' as const) : ('draft' as const),
        finalized_at: finalize ? new Date().toISOString() : null,
      };
      if (id) {
        const { error } = await supabase.from('progress_reports').update(row).eq('id', id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase.from('progress_reports').insert(row).select('id').single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['report'] });
    },
  });
}

/**
 * Builds the overview + goal table from attendance and goal progress in the period.
 * The therapist reviews and edits the text before finalizing.
 */
export async function buildReportDraft(opts: {
  studentId: string;
  from: string;
  to: string;
  goals: Goal[];
  firstName: string;
}): Promise<FormValues> {
  const [att, prog] = await Promise.all([
    supabase
      .from('student_attendance')
      .select('status')
      .eq('student_id', opts.studentId)
      .gte('attendance_date', opts.from)
      .lte('attendance_date', opts.to),
    opts.goals.length
      ? supabase
          .from('goal_progress')
          .select('goal_id, value, trials, successes, recorded_at')
          .in('goal_id', opts.goals.map((g) => g.id))
          .gte('recorded_at', `${opts.from}T00:00:00`)
          .lte('recorded_at', `${opts.to}T23:59:59`)
          .order('recorded_at')
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (att.error) throw att.error;
  if (prog.error) throw prog.error;

  const rows = att.data ?? [];
  const present = rows.filter((r) => r.status === 'present').length;
  const late = rows.filter((r) => r.status === 'late').length;
  const absent = rows.filter((r) => r.status === 'absent').length;
  const excused = rows.filter((r) => r.status === 'excused').length;
  const attended = present + late;
  const pct = rows.length ? Math.round((100 * attended) / rows.length) : null;
  const attendance = rows.length
    ? `${rows.length} sessions recorded: ${attended} attended${late ? ` (${late} late)` : ''}, ${absent} absent${excused ? `, ${excused} excused` : ''}. Attendance ${pct}%.`
    : 'No attendance recorded in this period.';

  const goalStatus = opts.goals.map((g) => {
    const pts = (prog.data ?? []).filter((p) => p.goal_id === g.id).map((p) => progressValue(p)).filter((v): v is number => v !== null);
    const first = pts[0];
    const last = pts[pts.length - 1];
    const status = g.status === 'achieved' ? 'Achieved' : pts.length >= 2 && last > first ? 'Progressing' : pts.length ? 'Progressing' : 'Not yet';
    const comment = pts.length
      ? `${pts.length} session${pts.length > 1 ? 's' : ''}; ${first === last ? `at ${last}` : `from ${first} to ${last}`}${g.unit === '%' || pts.some((v) => v <= 100) ? '%' : ''}`
      : 'Not targeted in this period';
    return { goal_id: g.id, status, comment };
  });

  const achieved = goalStatus.filter((g) => g.status === 'Achieved').length;
  const summary = `${opts.firstName} attended ${attended} of ${rows.length} sessions this period.${
    opts.goals.length ? ` ${achieved} of ${opts.goals.length} goals achieved; work continues on the rest.` : ''
  }`;

  return {
    overview: { attendance, summary },
    goals: { goal_status: goalStatus },
    next: { recommendations: '' },
  };
}

/** Branch admin: tell the parents on WhatsApp that the report is ready, then stamp the report. */
export function useNotifyReportReady() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: Report) => {
      const res = await api.post<{ sent: number; failed: number; reason?: string }>('/whatsapp/send', {
        student_id: r.student_id,
        purpose: 'report_ready',
        variables: {
          student_name: `${r.students?.first_name ?? ''} ${r.students?.last_name ?? ''}`.trim(),
          branch: r.branches?.name ?? '',
        },
        related_type: 'progress_report',
        related_id: r.id,
      });
      if (!res.sent) {
        throw new Error(res.reason ?? `WhatsApp message failed (${res.failed}). Check the WhatsApp settings and the parent's number.`);
      }
      const { error } = await supabase
        .from('progress_reports')
        .update({ shared_via_whatsapp_at: new Date().toISOString() })
        .eq('id', r.id);
      if (error) throw error;
      return res.sent;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['report'] });
    },
  });
}
