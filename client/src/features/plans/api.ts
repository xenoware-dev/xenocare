import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { TherapyType } from '@/types/app';

export type GoalStatus = 'active' | 'achieved' | 'discontinued' | 'on_hold';
export type PlanStatus = 'active' | 'completed' | 'on_hold' | 'discontinued';

export interface Goal {
  id: string;
  plan_id: string;
  domain: string | null;
  description: string;
  measurable_criteria: string | null;
  baseline_value: number | null;
  target_value: number | null;
  unit: string | null;
  target_date: string | null;
  status: GoalStatus;
  achieved_at: string | null;
  sort_order: number;
}

export interface Plan {
  id: string;
  student_id: string;
  branch_id: string;
  therapist_id: string;
  therapy_type: TherapyType;
  title: string;
  long_term_objective: string | null;
  start_date: string;
  review_date: string | null;
  status: PlanStatus;
  therapist: { full_name: string } | null;
  therapy_goals: Goal[];
}

const PLAN_SELECT =
  'id, student_id, branch_id, therapist_id, therapy_type, title, long_term_objective, start_date, review_date, status, therapist:profiles!treatment_plans_therapist_id_fkey(full_name), therapy_goals(id, plan_id, domain, description, measurable_criteria, baseline_value, target_value, unit, target_date, status, achieved_at, sort_order)';

export function usePlans(studentId: string | undefined) {
  return useQuery({
    queryKey: ['plans', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treatment_plans')
        .select(PLAN_SELECT)
        .eq('student_id', studentId!)
        .order('start_date', { ascending: false });
      if (error) throw error;
      const plans = data as unknown as Plan[];
      plans.forEach((p) => p.therapy_goals.sort((a, b) => a.sort_order - b.sort_order));
      return plans;
    },
  });
}

/** Active goals from active plans of a patient (optionally one therapy type). */
export function useActiveGoals(studentId: string | undefined, therapyType?: TherapyType) {
  const plans = usePlans(studentId);
  const goals =
    plans.data
      ?.filter((p) => p.status === 'active' && (!therapyType || p.therapy_type === therapyType))
      .flatMap((p) => p.therapy_goals.filter((g) => g.status === 'active')) ?? [];
  return { ...plans, goals };
}

export interface PlanInput {
  student_id: string;
  branch_id: string;
  therapist_id: string;
  therapy_type: TherapyType;
  title: string;
  long_term_objective?: string;
  review_date?: string;
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PlanInput) => {
      const { data, error } = await supabase
        .from('treatment_plans')
        .insert({
          ...input,
          long_term_objective: input.long_term_objective ?? null,
          review_date: input.review_date ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['plans', v.student_id] }),
  });
}

export function useSetPlanStatus(studentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PlanStatus }) => {
      const { error } = await supabase
        .from('treatment_plans')
        .update({ status, end_date: status === 'active' ? null : new Date().toISOString().slice(0, 10) })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans', studentId] }),
  });
}

export interface GoalInput {
  plan_id: string;
  domain?: string;
  description: string;
  measurable_criteria?: string;
  baseline_value?: number;
  target_value?: number;
  unit?: string;
  target_date?: string;
  sort_order: number;
}

export function useAddGoal(studentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GoalInput) => {
      const { error } = await supabase.from('therapy_goals').insert({
        plan_id: input.plan_id,
        domain: input.domain ?? null,
        description: input.description,
        measurable_criteria: input.measurable_criteria ?? null,
        baseline_value: input.baseline_value ?? null,
        target_value: input.target_value ?? null,
        unit: input.unit ?? null,
        target_date: input.target_date ?? null,
        sort_order: input.sort_order,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans', studentId] }),
  });
}

export function useSetGoalStatus(studentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: GoalStatus }) => {
      const { error } = await supabase
        .from('therapy_goals')
        .update({ status, achieved_at: status === 'achieved' ? new Date().toISOString().slice(0, 10) : null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans', studentId] }),
  });
}

export interface ProgressPoint {
  id: string;
  goal_id: string;
  session_id: string | null;
  value: number | null;
  trials: number | null;
  successes: number | null;
  prompt_level: string | null;
  note: string | null;
  recorded_at: string;
}

/** Accuracy % when trials were counted, otherwise the raw value. */
export function progressValue(p: Pick<ProgressPoint, 'value' | 'trials' | 'successes'>) {
  if (p.trials && p.successes !== null) return Math.round((100 * p.successes) / p.trials);
  return p.value;
}

export function useGoalProgress(goalIds: string[]) {
  return useQuery({
    queryKey: ['goal-progress', goalIds],
    enabled: goalIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goal_progress')
        .select('id, goal_id, session_id, value, trials, successes, prompt_level, note, recorded_at')
        .in('goal_id', goalIds)
        .order('recorded_at');
      if (error) throw error;
      return data as ProgressPoint[];
    },
  });
}
