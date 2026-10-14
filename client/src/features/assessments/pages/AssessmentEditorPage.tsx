import { ArrowLeft, CheckCircle2, Printer, Save } from 'lucide-react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { FormField, NativeSelect } from '@/components/common/FormField';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTemplate, useTemplates } from '@/features/forms/api';
import { TemplateForm } from '@/features/forms/TemplateForm';
import { missingRequired, type FormValues } from '@/features/forms/types';
import { useVisiblePatients } from '@/features/students/api';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { formatDate } from '@/lib/format';
import { todayIn } from '@/lib/time';
import { THERAPY_LABELS, type TherapyType } from '@/types/app';
import { useAssessment, useSaveAssessment } from '../api';

/** /assessments/new?student=… and /assessments/:id */
export function AssessmentEditorPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const canWrite = usePermission('assessments.write');
  const existing = useAssessment(id);
  const { data: templates } = useTemplates('assessment');
  const { data: patients } = useVisiblePatients();
  const save = useSaveAssessment();
  const confirm = useConfirm();

  const [studentId, setStudentId] = useState(params.get('student') ?? '');
  const [templateId, setTemplateId] = useState('');
  const [date, setDate] = useState(todayIn('Asia/Kolkata'));
  const [responses, setResponses] = useState<FormValues>({});
  const [summary, setSummary] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const { data: template } = useTemplate(templateId || null);

  useEffect(() => {
    const a = existing.data;
    if (!a) return;
    setStudentId(a.student_id);
    setTemplateId(a.template_id);
    setDate(a.assessment_date);
    setResponses(a.responses ?? {});
    setSummary(a.summary ?? '');
    setRecommendations(a.recommendations ?? '');
  }, [existing.data]);

  if (id && existing.isLoading) return <LoadingScreen />;
  if (id && existing.error) return <p className="text-sm text-destructive">{existing.error.message}</p>;

  const a = existing.data;
  const final = a?.status === 'final';
  const readOnly = final || !canWrite;
  const patient = patients?.find((p) => p.id === studentId);
  const patientName = a?.students ? `${a.students.first_name} ${a.students.last_name ?? ''}` : patient ? `${patient.first_name} ${patient.last_name ?? ''}` : '';

  const submit = async (finalize: boolean) => {
    if (!template || !profile) return;
    if (!studentId) return toast.error('Pick a patient');
    const branchId = a?.branch_id ?? patient?.home_branch_id;
    if (!branchId) return toast.error('Pick a patient');
    if (finalize) {
      const missing = missingRequired(template.schema, responses);
      if (missing.length) return toast.error('Fill in the required fields', { description: missing.join(', ') });
      const ok = await confirm({ title: 'Finalize this assessment?', description: 'It becomes read-only.', confirmLabel: 'Finalize' });
      if (!ok.ok) return;
    }
    try {
      const savedId = await save.mutateAsync({
        id: a?.id,
        student_id: studentId,
        branch_id: branchId,
        therapist_id: a?.therapist_id ?? profile.id,
        template_id: template.id,
        template_version: template.version,
        therapy_type: (template.therapy_type as TherapyType | null) ?? 'other',
        assessment_date: date,
        responses,
        summary,
        recommendations,
        finalize,
      });
      toast.success(finalize ? 'Assessment finalized' : 'Draft saved');
      if (!a) navigate(`/assessments/${savedId}`, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save assessment');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 print:max-w-none">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 mb-2 print:hidden" onClick={() => navigate(-1)}>
            <ArrowLeft /> Back
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{template?.name ?? 'New assessment'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {patientName && (
              <Link to={`/students/${studentId}`} className="hover:underline">{patientName}</Link>
            )}
            {a && ` · ${formatDate(a.assessment_date)} · ${a.therapist?.full_name ?? ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {a && <StatusBadge status={a.status} />}
          {final && (
            <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
              <Printer /> Print
            </Button>
          )}
        </div>
      </div>

      {!a && (
        <Card className="print:hidden">
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <FormField label="Patient" id="as-patient">
              <NativeSelect id="as-patient" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">Select…</option>
                {patients?.map((p) => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name ?? ''} ({p.student_code})</option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Assessment form" id="as-template">
              <NativeSelect id="as-template" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                <option value="">Select…</option>
                {templates?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.therapy_type ? ` (${THERAPY_LABELS[t.therapy_type as TherapyType]})` : ''}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Date" id="as-date">
              <Input id="as-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </FormField>
          </CardContent>
        </Card>
      )}

      {template ? (
        <>
          <Card>
            <CardContent>
              <TemplateForm schema={template.schema} values={responses} onChange={setResponses} readOnly={readOnly} idPrefix="as" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Summary & recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Summary" id="as-summary">
                <Textarea id="as-summary" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} readOnly={readOnly} />
              </FormField>
              <FormField label="Recommendations" id="as-rec">
                <Textarea id="as-rec" rows={3} value={recommendations} onChange={(e) => setRecommendations(e.target.value)} readOnly={readOnly} />
              </FormField>
            </CardContent>
          </Card>
          {!readOnly && (
            <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur print:hidden">
              <Button variant="outline" onClick={() => submit(false)} disabled={save.isPending}>
                <Save /> Save draft
              </Button>
              <Button onClick={() => submit(true)} disabled={save.isPending}>
                <CheckCircle2 /> Finalize
              </Button>
            </div>
          )}
        </>
      ) : (
        !a && <p className="text-center text-sm text-muted-foreground">Pick a patient and an assessment form to begin.</p>
      )}
    </div>
  );
}
