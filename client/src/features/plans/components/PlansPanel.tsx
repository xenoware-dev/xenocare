import { Plus, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormField, NativeSelect } from '@/components/common/FormField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/format';
import { THERAPY_LABELS, type TherapyType } from '@/types/app';
import {
  useAddGoal,
  useCreatePlan,
  useGoalProgress,
  usePlans,
  useSetGoalStatus,
  useSetPlanStatus,
  type GoalStatus,
  type Plan,
  type PlanStatus,
} from '../api';
import { GoalProgressChart } from './GoalProgressChart';

const GOAL_STATUS: GoalStatus[] = ['active', 'achieved', 'on_hold', 'discontinued'];
const PLAN_STATUS: PlanStatus[] = ['active', 'on_hold', 'completed', 'discontinued'];

/** Treatment plans with SMART goals and their progress charts for one patient. */
export function PlansPanel({
  studentId,
  branchId,
  defaultTherapist,
  canEdit,
}: {
  studentId: string;
  branchId: string;
  /** Therapist who owns new plans (the signed-in therapist, or picked by an admin). */
  defaultTherapist: { id: string; therapy_type: TherapyType } | null;
  canEdit: boolean;
}) {
  const { data: plans, isLoading, error } = usePlans(studentId);
  const goalIds = plans?.flatMap((p) => p.therapy_goals.map((g) => g.id)) ?? [];
  const { data: progress } = useGoalProgress(goalIds);
  const [newPlan, setNewPlan] = useState(false);

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;

  return (
    <div className="space-y-4">
      {canEdit && defaultTherapist && (
        <div className="flex justify-end">
          <Button onClick={() => setNewPlan(true)}>
            <Plus /> New treatment plan
          </Button>
        </div>
      )}
      {!plans?.length && (
        <Card>
          <CardContent>
            <EmptyState
              icon={Target}
              title="No treatment plan yet"
              description="Create a plan with SMART goals. Progress recorded in session notes is charted here."
              action={canEdit && defaultTherapist ? <Button size="sm" onClick={() => setNewPlan(true)}><Plus /> New treatment plan</Button> : undefined}
            />
          </CardContent>
        </Card>
      )}
      {plans?.map((plan) => (
        <PlanCard key={plan.id} plan={plan} studentId={studentId} canEdit={canEdit} progress={progress ?? []} />
      ))}
      {defaultTherapist && (
        <NewPlanDialog
          open={newPlan}
          onOpenChange={setNewPlan}
          studentId={studentId}
          branchId={branchId}
          therapist={defaultTherapist}
        />
      )}
    </div>
  );
}

function PlanCard({
  plan,
  studentId,
  canEdit,
  progress,
}: {
  plan: Plan;
  studentId: string;
  canEdit: boolean;
  progress: NonNullable<ReturnType<typeof useGoalProgress>['data']>;
}) {
  const setPlanStatus = useSetPlanStatus(studentId);
  const setGoalStatus = useSetGoalStatus(studentId);
  const [addingGoal, setAddingGoal] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{plan.title}</CardTitle>
          <CardDescription>
            {THERAPY_LABELS[plan.therapy_type]} · {plan.therapist?.full_name} · since {formatDate(plan.start_date)}
            {plan.review_date && ` · review ${formatDate(plan.review_date)}`}
          </CardDescription>
          {plan.long_term_objective && <p className="mt-2 text-sm">{plan.long_term_objective}</p>}
        </div>
        {canEdit ? (
          <NativeSelect
            className="w-36"
            aria-label="Plan status"
            value={plan.status}
            onChange={(e) =>
              setPlanStatus.mutate(
                { id: plan.id, status: e.target.value as PlanStatus },
                { onError: (err) => toast.error(err.message) },
              )
            }
          >
            {PLAN_STATUS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </NativeSelect>
        ) : (
          <StatusBadge status={plan.status} />
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {plan.therapy_goals.length === 0 && <p className="text-sm text-muted-foreground">No goals yet.</p>}
        {plan.therapy_goals.map((g) => (
          <div key={g.id} className="rounded-md border p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div className="flex gap-2">
                <Target className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="text-sm font-medium">
                    {g.domain && <span className="text-muted-foreground">{g.domain}: </span>}
                    {g.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {g.measurable_criteria}
                    {g.baseline_value !== null && ` · baseline ${g.baseline_value}${g.unit ?? ''}`}
                    {g.target_date && ` · by ${formatDate(g.target_date)}`}
                  </p>
                </div>
              </div>
              {canEdit ? (
                <NativeSelect
                  className="w-32"
                  aria-label="Goal status"
                  value={g.status}
                  onChange={(e) =>
                    setGoalStatus.mutate(
                      { id: g.id, status: e.target.value as GoalStatus },
                      { onError: (err) => toast.error(err.message) },
                    )
                  }
                >
                  {GOAL_STATUS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </NativeSelect>
              ) : (
                <StatusBadge status={g.status} />
              )}
            </div>
            <GoalProgressChart goal={g} points={progress.filter((p) => p.goal_id === g.id)} />
          </div>
        ))}
        {canEdit && plan.status === 'active' && (
          <Button variant="outline" size="sm" onClick={() => setAddingGoal(true)}>
            <Plus /> Add SMART goal
          </Button>
        )}
      </CardContent>
      <AddGoalDialog
        open={addingGoal}
        onOpenChange={setAddingGoal}
        planId={plan.id}
        studentId={studentId}
        nextOrder={plan.therapy_goals.length}
      />
    </Card>
  );
}

function NewPlanDialog({
  open,
  onOpenChange,
  studentId,
  branchId,
  therapist,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  branchId: string;
  therapist: { id: string; therapy_type: TherapyType };
}) {
  const create = useCreatePlan();
  const [title, setTitle] = useState('');
  const [therapyType, setTherapyType] = useState<TherapyType>(therapist.therapy_type);
  const [objective, setObjective] = useState('');
  const [review, setReview] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Enter a plan title');
    try {
      await create.mutateAsync({
        student_id: studentId,
        branch_id: branchId,
        therapist_id: therapist.id,
        therapy_type: therapyType,
        title: title.trim(),
        long_term_objective: objective.trim() || undefined,
        review_date: review || undefined,
      });
      toast.success('Treatment plan created. Add SMART goals next.');
      setTitle('');
      setObjective('');
      setReview('');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create plan');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New treatment plan</DialogTitle>
          <DialogDescription>Goals are added to the plan after it is created.</DialogDescription>
        </DialogHeader>
        <form id="new-plan" onSubmit={submit} className="space-y-4">
          <FormField label="Title" id="plan-title">
            <Input id="plan-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Expressive language – Term 1" />
          </FormField>
          <FormField label="Therapy" id="plan-type">
            <NativeSelect id="plan-type" value={therapyType} onChange={(e) => setTherapyType(e.target.value as TherapyType)}>
              {(Object.keys(THERAPY_LABELS) as TherapyType[]).map((t) => <option key={t} value={t}>{THERAPY_LABELS[t]}</option>)}
            </NativeSelect>
          </FormField>
          <FormField label="Long-term objective" id="plan-objective">
            <Textarea id="plan-objective" rows={3} value={objective} onChange={(e) => setObjective(e.target.value)} />
          </FormField>
          <FormField label="Review date" id="plan-review">
            <Input id="plan-review" type="date" value={review} onChange={(e) => setReview(e.target.value)} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="new-plan" disabled={create.isPending}>Create plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddGoalDialog({
  open,
  onOpenChange,
  planId,
  studentId,
  nextOrder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  studentId: string;
  nextOrder: number;
}) {
  const add = useAddGoal(studentId);
  const empty = { domain: '', description: '', measurable_criteria: '', baseline: '', target: '', unit: '%', target_date: '' };
  const [v, setV] = useState(empty);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.description.trim()) return toast.error('Describe the goal');
    try {
      await add.mutateAsync({
        plan_id: planId,
        domain: v.domain.trim() || undefined,
        description: v.description.trim(),
        measurable_criteria: v.measurable_criteria.trim() || undefined,
        baseline_value: v.baseline === '' ? undefined : Number(v.baseline),
        target_value: v.target === '' ? undefined : Number(v.target),
        unit: v.unit.trim() || undefined,
        target_date: v.target_date || undefined,
        sort_order: nextOrder,
      });
      toast.success('Goal added');
      setV(empty);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add goal');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add SMART goal</DialogTitle>
          <DialogDescription>Specific, Measurable, Achievable, Relevant, Time-bound.</DialogDescription>
        </DialogHeader>
        <form id="add-goal" onSubmit={submit} className="space-y-4">
          <FormField label="Domain" id="g-domain" hint="e.g. Receptive language, Fine motor, Balance">
            <Input id="g-domain" value={v.domain} onChange={set('domain')} />
          </FormField>
          <FormField label="Goal" id="g-desc">
            <Textarea id="g-desc" rows={2} value={v.description} onChange={set('description')}
              placeholder="e.g. Child will name 20 common objects when shown pictures" />
          </FormField>
          <FormField label="Measured by" id="g-crit">
            <Input id="g-crit" value={v.measurable_criteria} onChange={set('measurable_criteria')} placeholder="e.g. 80% accuracy over 3 consecutive sessions" />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Baseline" id="g-base">
              <Input id="g-base" type="number" value={v.baseline} onChange={set('baseline')} />
            </FormField>
            <FormField label="Target" id="g-target">
              <Input id="g-target" type="number" value={v.target} onChange={set('target')} />
            </FormField>
            <FormField label="Unit" id="g-unit">
              <Input id="g-unit" value={v.unit} onChange={set('unit')} />
            </FormField>
          </div>
          <FormField label="Target date" id="g-date">
            <Input id="g-date" type="date" value={v.target_date} onChange={set('target_date')} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="add-goal" disabled={add.isPending}>Add goal</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
