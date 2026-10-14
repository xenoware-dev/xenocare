import { ArrowLeft, CheckCircle2, MessageCircle, Printer, Save, Wand2 } from 'lucide-react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { FormField, NativeSelect } from '@/components/common/FormField';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTemplates } from '@/features/forms/api';
import { TemplateForm } from '@/features/forms/TemplateForm';
import { missingRequired, type FormValues } from '@/features/forms/types';
import { usePlans } from '@/features/plans/api';
import { useVisiblePatients } from '@/features/students/api';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { formatDate } from '@/lib/format';
import { addDays, todayIn } from '@/lib/time';
import { THERAPY_LABELS, type TherapyType } from '@/types/app';
import { buildReportDraft, useNotifyReportReady, useReport, useSaveReport } from '../api';

/** /reports/new?student=… and /reports/:id. Final reports print as a clean A4 page (Save as PDF). */
export function ReportEditorPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const canWrite = usePermission('reports.write');
  const canNotify = usePermission('whatsapp.send');
  const existing = useReport(id);
  const { data: templates } = useTemplates('progress_report');
  const template = templates?.[0];
  const { data: patients } = useVisiblePatients();
  const save = useSaveReport();
  const notify = useNotifyReportReady();
  const confirm = useConfirm();

  const today = todayIn('Asia/Kolkata');
  const [studentId, setStudentId] = useState(params.get('student') ?? '');
  const [therapyType, setTherapyType] = useState<TherapyType>('speech');
  const [from, setFrom] = useState(addDays(today, -30));
  const [to, setTo] = useState(today);
  const [content, setContent] = useState<FormValues>({});
  const [building, setBuilding] = useState(false);
  const { data: plans } = usePlans(studentId || undefined);

  const r = existing.data;
  useEffect(() => {
    if (!r) return;
    setStudentId(r.student_id);
    setTherapyType(r.therapy_type);
    setFrom(r.period_start);
    setTo(r.period_end);
    setContent(r.content ?? {});
  }, [r]);

  const goals = useMemo(
    () =>
      (plans ?? [])
        .filter((p) => p.therapy_type === therapyType && p.status !== 'discontinued')
        .flatMap((p) => p.therapy_goals.filter((g) => g.status === 'active' || g.status === 'achieved')),
    [plans, therapyType],
  );

  if (id && existing.isLoading) return <LoadingScreen />;
  if (id && existing.error) return <p className="text-sm text-destructive">{existing.error.message}</p>;

  const final = r?.status === 'final';
  const readOnly = final || !canWrite;
  const patient = patients?.find((p) => p.id === studentId);
  const name = r?.students ? `${r.students.first_name} ${r.students.last_name ?? ''}` : patient ? `${patient.first_name} ${patient.last_name ?? ''}` : '';

  const autofill = async () => {
    if (!studentId) return toast.error('Pick a patient first');
    setBuilding(true);
    try {
      setContent(await buildReportDraft({ studentId, from, to, goals, firstName: name.split(' ')[0] || 'The child' }));
      toast.success('Filled from attendance and goal progress. Review before finalizing.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not build the draft');
    } finally {
      setBuilding(false);
    }
  };

  const submit = async (finalize: boolean) => {
    if (!template || !profile) return;
    const branchId = r?.branch_id ?? patient?.home_branch_id;
    if (!studentId || !branchId) return toast.error('Pick a patient');
    if (to < from) return toast.error('The period end must be after the start');
    if (finalize) {
      const missing = missingRequired(template.schema, content);
      if (missing.length) return toast.error('Fill in the required fields', { description: missing.join(', ') });
      const ok = await confirm({ title: 'Finalize this report?', description: 'It becomes read-only and can be shared with parents.', confirmLabel: 'Finalize' });
      if (!ok.ok) return;
    }
    try {
      const savedId = await save.mutateAsync({
        id: r?.id,
        student_id: studentId,
        branch_id: branchId,
        therapist_id: r?.therapist_id ?? profile.id,
        template_id: template.id,
        therapy_type: therapyType,
        period_start: from,
        period_end: to,
        content,
        finalize,
      });
      toast.success(finalize ? 'Report finalized' : 'Draft saved');
      if (!r) navigate(`/reports/${savedId}`, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save report');
    }
  };

  const sendToParents = async () => {
    if (!r) return;
    try {
      const sent = await notify.mutateAsync(r);
      toast.success(`Parents notified on WhatsApp (${sent})`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not notify parents');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 print:max-w-none print:space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => navigate(-1)}>
            <ArrowLeft /> Back
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{r ? 'Progress report' : 'New progress report'}</h1>
          {r && (
            <p className="mt-1 text-sm text-muted-foreground">
              {name} · {THERAPY_LABELS[r.therapy_type]} · {formatDate(r.period_start)} – {formatDate(r.period_end)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {r && <StatusBadge status={r.status} />}
          {r?.shared_via_whatsapp_at && <StatusBadge status="completed" label={`Sent to parents ${formatDate(r.shared_via_whatsapp_at)}`} />}
          {final && (
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer /> Print / PDF
            </Button>
          )}
          {final && canNotify && (
            <Button size="sm" onClick={sendToParents} disabled={notify.isPending}>
              <MessageCircle /> Notify parents
            </Button>
          )}
        </div>
      </div>

      {/* Print header (A4) */}
      {r && (
        <div className="hidden border-b pb-3 print:block">
          <p className="text-lg font-semibold">{r.branches?.name ?? 'XenoCare'} · Progress report</p>
          <p className="text-sm">
            {name} ({r.students?.student_code}) · {THERAPY_LABELS[r.therapy_type]} · {formatDate(r.period_start)} – {formatDate(r.period_end)}
          </p>
          <p className="text-sm">Therapist: {r.therapist?.full_name}</p>
        </div>
      )}

      {!r && (
        <Card>
          <CardContent className="grid gap-4 sm:grid-cols-4">
            <FormField label="Patient" id="rp-patient" className="sm:col-span-2">
              <NativeSelect id="rp-patient" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">Select…</option>
                {patients?.map((p) => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name ?? ''} ({p.student_code})</option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Therapy" id="rp-type" className="sm:col-span-2">
              <NativeSelect id="rp-type" value={therapyType} onChange={(e) => setTherapyType(e.target.value as TherapyType)}>
                {(Object.keys(THERAPY_LABELS) as TherapyType[]).map((t) => <option key={t} value={t}>{THERAPY_LABELS[t]}</option>)}
              </NativeSelect>
            </FormField>
            <FormField label="From" id="rp-from">
              <Input id="rp-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </FormField>
            <FormField label="To" id="rp-to">
              <Input id="rp-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </FormField>
            <div className="flex items-end sm:col-span-2">
              <Button type="button" variant="outline" onClick={autofill} disabled={building || !studentId}>
                <Wand2 /> {building ? 'Building…' : 'Auto-fill from sessions'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {template ? (
        <Card className="print:border-0 print:shadow-none">
          <CardContent className="print:p-0">
            {!readOnly && r && (
              <div className="mb-4 flex justify-end print:hidden">
                <Button type="button" variant="outline" size="sm" onClick={autofill} disabled={building}>
                  <Wand2 /> Re-fill from sessions
                </Button>
              </div>
            )}
            <TemplateForm
              schema={template.schema}
              values={content}
              onChange={setContent}
              readOnly={readOnly}
              goals={goals.map((g) => ({ id: g.id, description: g.description }))}
              idPrefix="rp"
            />
          </CardContent>
        </Card>
      ) : (
        <LoadingScreen />
      )}

      {!readOnly && template && (
        <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur print:hidden">
          <Button variant="outline" onClick={() => submit(false)} disabled={save.isPending}>
            <Save /> Save draft
          </Button>
          <Button onClick={() => submit(true)} disabled={save.isPending}>
            <CheckCircle2 /> Finalize
          </Button>
        </div>
      )}
    </div>
  );
}
