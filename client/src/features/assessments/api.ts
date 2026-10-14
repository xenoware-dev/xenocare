import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormValues } from '@/features/forms/types';
import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/database.types';
import type { TherapyType } from '@/types/app';

export interface AssessmentListItem {
  id: string;
  assessment_date: string;
  therapy_type: TherapyType;
  status: 'draft' | 'final';
  students: { id: string; first_name: string; last_name: string | null; student_code: string } | null;
  therapist: { full_name: string } | null;
  form_templates: { name: string } | null;
}

export function useAssessments(opts: { branchId: string | null; studentId?: string }) {
  return useQuery({
    queryKey: ['assessments', opts],
    queryFn: async () => {
      let q = supabase
        .from('assessments')
        .select(
          'id, assessment_date, therapy_type, status, students(id, first_name, last_name, student_code), therapist:profiles!assessments_therapist_id_fkey(full_name), form_templates(name)',
        )
        .order('assessment_date', { ascending: false })
        .limit(200);
      if (opts.branchId) q = q.eq('branch_id', opts.branchId);
      if (opts.studentId) q = q.eq('student_id', opts.studentId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as AssessmentListItem[];
    },
  });
}

export interface Assessment {
  id: string;
  student_id: string;
  branch_id: string;
  therapist_id: string;
  template_id: string;
  template_version: number;
  therapy_type: TherapyType;
  assessment_date: string;
  responses: FormValues;
  summary: string | null;
  recommendations: string | null;
  status: 'draft' | 'final';
  finalized_at: string | null;
  students: { first_name: string; last_name: string | null; student_code: string } | null;
  therapist: { full_name: string } | null;
}

export function useAssessment(id: string | undefined) {
  return useQuery({
    queryKey: ['assessment', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select(
          'id, student_id, branch_id, therapist_id, template_id, template_version, therapy_type, assessment_date, responses, summary, recommendations, status, finalized_at, students(first_name, last_name, student_code), therapist:profiles!assessments_therapist_id_fkey(full_name)',
        )
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as unknown as Assessment;
    },
  });
}

export interface SaveAssessmentInput {
  id?: string;
  student_id: string;
  branch_id: string;
  therapist_id: string;
  template_id: string;
  template_version: number;
  therapy_type: TherapyType;
  assessment_date: string;
  responses: FormValues;
  summary: string;
  recommendations: string;
  finalize: boolean;
}

export function useSaveAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, finalize, ...input }: SaveAssessmentInput) => {
      const row = {
        ...input,
        responses: input.responses as unknown as Json,
        summary: input.summary || null,
        recommendations: input.recommendations || null,
        status: finalize ? ('final' as const) : ('draft' as const),
        finalized_at: finalize ? new Date().toISOString() : null,
      };
      if (id) {
        const { error } = await supabase.from('assessments').update(row).eq('id', id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase.from('assessments').insert(row).select('id').single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessments'] });
      qc.invalidateQueries({ queryKey: ['assessment'] });
    },
  });
}
