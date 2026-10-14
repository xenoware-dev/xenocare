import { ArrowLeft, Lock, Save } from 'lucide-react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { NativeSelect } from '@/components/common/FormField';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTemplate, useTemplates } from '@/features/forms/api';
import { TemplateForm } from '@/features/forms/TemplateForm';
import { missingRequired, type FormValues } from '@/features/forms/types';
import { useActiveGoals } from '@/features/plans/api';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { timeIn } from '@/lib/time';
import { THERAPY_LABELS } from '@/types/app';
import { useNoteContext, useSaveNote, type GoalResult } from '../api';

const PROMPT_LEVELS = ['Independent', 'Verbal', 'Gestural', 'Model', 'Physical'];

export function SessionNotePage() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const canWrite = usePermission('sessions.write');
  const { data: ctx, isLoading, error } = useNoteContext(appointmentId);
  const { data: soapTemplates } = useTemplates('soap');
  const { data: savedTemplate } = useTemplate(ctx?.session?.template_id);
  const template = savedTemplate ?? soapTemplates?.[0];
  const { goals, data: plans } = useActiveGoals(ctx?.appointment.student_id, ctx?.appointment.therapy_type);
  const save = useSaveNote();
  const confirm = useConfirm();

  const [notes, setNotes] = useState<FormValues>({});
  const [goalResults, setGoalResults] = useState<GoalResult[]>([]);
  const [activities, setActivities] = useState('');

  // Load the saved draft once.
  useEffect(() => {
    if (!ctx) return;
    const { goal_results, ...rest } = ctx.session?.notes ?? {};
    setNotes(rest as FormValues);
    setGoalResults(goal_results ?? []);
    setActivities(ctx.session?.activities ?? '');
  }, [ctx]);

  const planId = useMemo(
    () => plans?.find((p) => p.status === 'active' && p.therapy_type === ctx?.appointment.therapy_type)?.id ?? null,
    [plans, ctx],
  );

  if (isLoading) return <LoadingScreen />;
  if (error || !ctx) return <p className="text-sm text-destructive">Could not load this session: {error?.message}</p>;

  const { appointment, session } = ctx;
  const tz = appointment.branch?.timezone ?? 'Asia/Kolkata';
  const locked = session?.is_locked ?? false;
  const isMine = appointment.therapist_id === profile?.id;
  const readOnly = locked || !canWrite;
  const dateLabel = new Intl.DateTimeFormat('en-IN', { dateStyle: 'full', timeZone: tz }).format(new Date(appointment.start_at));

  const setGoal = (goalId: string, patch: Partial<GoalResult>) =>
    setGoalResults((rows) =>
      rows.some((r) => r.goal_id === goalId)
        ? rows.map((r) => (r.goal_id === goalId ? { ...r, ...patch } : r))
        : [...rows, { goal_id: goalId, ...patch }],
    );

  const submit = async (sign: boolean) => {
    if (sign && template) {
      const missing = missingRequired(template.schema, notes);
      if (missing.length) {
        toast.error('Fill in the required fields before signing', { description: missing.join(', ') });
        return;
      }
      const bad = goalResults.find((g) => g.trials != null && g.successes != null && g.successes > g.trials);
      if (bad) {
        toast.error('Successes cannot be more than trials');
        return;
      }
      const ok = await confirm({
        title: 'Sign and lock this note?',
        description: 'The appointment is marked completed and the note can no longer be edited. Only the clinic owner can amend it afterwards.',
        confirmLabel: 'Sign & lock',
      });
      if (!ok.ok) return;
    }
    const plan = (notes.plan ?? {}) as Record<string, string | undefined>;
    try {
      await save.mutateAsync({
        context: ctx,
        template_id: template?.id ?? null,
        plan_id: planId,
        notes,
        goal_results: goalResults.filter((g) => goals.some((x) => x.id === g.goal_id)),
        activities,
        home_program: plan.home_program ?? '',
        parent_feedback: ((notes.subjective ?? {}) as Record<string, string>).parent_report ?? '',
        next_session_plan: plan.next_steps ?? '',
        sign,
      });
      toast.success(sign ? 'Note signed and locked' : 'Draft saved');
      if (sign) navigate(-1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the note');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => navigate(-1)}>
            <ArrowLeft /> Back
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            <Link to={`/students/${appointment.student_id}`} className="hover:underline">
              {appointment.student?.first_name} {appointment.student?.last_name}
            </Link>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {THERAPY_LABELS[appointment.therapy_type]} · {dateLabel} · {timeIn(appointment.start_at, tz)}–{timeIn(appointment.end_at, tz)}
            {!isMine && appointment.therapist && ` · ${appointment.therapist.full_name}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {appointment.attendance && <StatusBadge status={appointment.attendance.status} />}
          {locked ? (
            <Badge>
              <Lock className="size-3" /> Signed {session?.signed_at && new Date(session.signed_at).toLocaleDateString('en-IN')}
            </Badge>
          ) : (
            <StatusBadge status="draft" label={session ? 'Draft' : 'New note'} />
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{template?.name ?? 'Session note'}</CardTitle>
          <CardDescription>The home program is shared with parents.</CardDescription>
        </CardHeader>
        <CardContent>
          {template ? (
            <TemplateForm schema={template.schema} values={notes} onChange={setNotes} readOnly={readOnly} idPrefix="soap" />
          ) : (
            <p className="text-sm text-muted-foreground">Loading template…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Goals worked on</CardTitle>
          <CardDescription>
            {goals.length
              ? 'Record trials and successes for the goals you targeted today. This feeds the progress charts.'
              : 'No active goals for this therapy yet. Add a treatment plan on the patient page.'}
          </CardDescription>
        </CardHeader>
        {goals.length > 0 && (
          <CardContent className="space-y-4">
            {goals.map((g) => {
              const r = goalResults.find((x) => x.goal_id === g.id) ?? { goal_id: g.id };
              const pct = r.trials && r.successes != null ? Math.round((100 * r.successes) / r.trials) : null;
              return (
                <div key={g.id} className="rounded-md border p-3">
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">
                      {g.domain && <span className="text-muted-foreground">{g.domain}: </span>}
                      {g.description}
                    </p>
                    {pct !== null && <Badge variant="outline">{pct}% accuracy</Badge>}
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-[6rem_6rem_10rem_1fr]">
                    <div className="space-y-1">
                      <Label htmlFor={`t-${g.id}`} className="text-xs">Trials</Label>
                      <Input id={`t-${g.id}`} type="number" min={0} value={r.trials ?? ''} readOnly={readOnly}
                        onChange={(e) => setGoal(g.id, { trials: e.target.value === '' ? null : Number(e.target.value) })} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`s-${g.id}`} className="text-xs">Successes</Label>
                      <Input id={`s-${g.id}`} type="number" min={0} value={r.successes ?? ''} readOnly={readOnly}
                        onChange={(e) => setGoal(g.id, { successes: e.target.value === '' ? null : Number(e.target.value) })} />
                    </div>
                    <div className="col-span-2 space-y-1 sm:col-span-1">
                      <Label htmlFor={`p-${g.id}`} className="text-xs">Prompt level</Label>
                      <NativeSelect id={`p-${g.id}`} value={r.prompt_level ?? ''} disabled={readOnly}
                        onChange={(e) => setGoal(g.id, { prompt_level: e.target.value || null })}>
                        <option value="">—</option>
                        {PROMPT_LEVELS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </NativeSelect>
                    </div>
                    <div className="col-span-2 space-y-1 sm:col-span-1">
                      <Label htmlFor={`c-${g.id}`} className="text-xs">Comment</Label>
                      <Input id={`c-${g.id}`} value={r.comment ?? ''} readOnly={readOnly}
                        onChange={(e) => setGoal(g.id, { comment: e.target.value })} />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activities done</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea rows={3} value={activities} onChange={(e) => setActivities(e.target.value)} readOnly={readOnly}
            placeholder="Games, exercises and materials used in this session" aria-label="Activities done" />
        </CardContent>
      </Card>

      {!readOnly && (
        <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-10 -mx-4 flex rounded-t-xl lg:bottom-0 lg:rounded-none flex-wrap justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur">
          <Button variant="outline" onClick={() => submit(false)} disabled={save.isPending}>
            <Save /> Save draft
          </Button>
          <Button onClick={() => submit(true)} disabled={save.isPending}>
            <Lock /> Sign & lock
          </Button>
        </div>
      )}
      {locked && <p className="text-center text-xs text-muted-foreground">Signed notes are locked. Only the clinic owner can amend them.</p>}
    </div>
  );
}
