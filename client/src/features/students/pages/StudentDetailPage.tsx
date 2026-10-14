import { ArrowLeft, ClipboardList, FileBarChart, NotebookPen, Phone } from 'lucide-react';
import { UserAvatar } from '@/components/common/UserAvatar';
import { EmptyTableRow, TableSkeleton } from '@/components/common/Skeletons';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Link, useNavigate, useParams } from 'react-router';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAssessments } from '@/features/assessments/api';
import { PlansPanel } from '@/features/plans/components/PlansPanel';
import { useReports } from '@/features/reports/api';
import { useSessionList } from '@/features/sessions/api';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { formatDate } from '@/lib/format';
import { THERAPY_LABELS } from '@/types/app';
import { useStudent } from '../api';

function age(dob: string | null) {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) years--;
  return years;
}

export function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const canPlan = usePermission('plans.write');
  const canAssess = usePermission('assessments.write');
  const canReport = usePermission('reports.write');
  const { data: s, isLoading, error } = useStudent(id);

  if (isLoading) return <LoadingScreen />;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;
  if (!s) return <p className="text-sm text-muted-foreground">Patient not found, or you are not on this patient's care team.</p>;

  const care = s.student_therapists.filter((t) => !t.end_date);
  const mine = care.find((t) => t.therapist_id === profile?.id);
  // New plans belong to the signed-in therapist; an admin creates them for the first care-team therapist.
  const planOwner = mine
    ? { id: mine.therapist_id, therapy_type: mine.therapy_type }
    : profile?.role === 'admin' && care[0]
      ? { id: care[0].therapist_id, therapy_type: care[0].therapy_type }
      : null;
  const years = age(s.date_of_birth);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => navigate(-1)}>
            <ArrowLeft /> Back
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <UserAvatar name={`${s.first_name} ${s.last_name ?? ''}`} className="size-12 text-base" />
            <h1 className="text-2xl font-bold tracking-tight">
              {s.first_name} {s.last_name}
            </h1>
            <StatusBadge status={s.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono">{s.student_code}</span>
            {years !== null && ` · ${years} yrs`}
            {s.gender !== 'unspecified' && ` · ${s.gender}`} · {s.branches?.name} · since {formatDate(s.intake_date)}
          </p>
          {s.diagnosis.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {s.diagnosis.map((d) => <Badge key={d} variant="outline">{d}</Badge>)}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {canAssess && (
            <Button asChild variant="outline">
              <Link to={`/assessments/new?student=${s.id}`}><ClipboardList /> New assessment</Link>
            </Button>
          )}
          {canReport && (
            <Button asChild variant="outline">
              <Link to={`/reports/new?student=${s.id}`}><FileBarChart /> New report</Link>
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plan">Plan & goals</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Care team</CardTitle></CardHeader>
              <CardContent>
                {care.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No therapist assigned.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {care.map((t) => (
                      <li key={`${t.therapist_id}-${t.therapy_type}`} className="flex justify-between gap-4">
                        <span className="font-medium">{t.profiles?.full_name}</span>
                        <span className="text-muted-foreground">{THERAPY_LABELS[t.therapy_type]} · since {formatDate(t.start_date)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Parents</CardTitle></CardHeader>
              <CardContent>
                {s.student_parents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No parent recorded.</p>
                ) : (
                  <ul className="space-y-3 text-sm">
                    {s.student_parents.map((p, i) => (
                      <li key={i}>
                        <p className="font-medium">
                          {p.parents?.full_name} <span className="font-normal text-muted-foreground">({p.relationship})</span>
                          {p.is_primary_contact && <Badge variant="outline" className="ml-2">primary</Badge>}
                        </p>
                        {(p.parents?.whatsapp_number || p.parents?.phone) && (
                          <a href={`tel:${p.parents.whatsapp_number ?? p.parents.phone}`} className="inline-flex items-center gap-1 text-muted-foreground hover:underline">
                            <Phone className="size-3" /> {p.parents.whatsapp_number ?? p.parents.phone}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Medical</CardTitle></CardHeader>
              <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
                <Info label="Medical history" value={s.medical_history} />
                <Info label="Allergies" value={s.allergies} />
                <Info label="Medications" value={s.medications} />
                <Info label="School" value={s.school_name} />
                <Info label="Notes" value={s.notes} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="plan" className="mt-4">
          <PlansPanel studentId={s.id} branchId={s.home_branch_id} defaultTherapist={planOwner} canEdit={canPlan} />
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <PatientSessions studentId={s.id} />
        </TabsContent>

        <TabsContent value="assessments" className="mt-4">
          <PatientAssessments studentId={s.id} />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <PatientReports studentId={s.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="whitespace-pre-line">{value || '—'}</p>
    </div>
  );
}

function PatientSessions({ studentId }: { studentId: string }) {
  const { data, isLoading } = useSessionList({ branchId: null, studentId, status: 'all' });
  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Therapy</TableHead>
              <TableHead>Therapist</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="text-right">Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeleton cols={5} rows={3} />}
            {data?.length === 0 && <EmptyTableRow cols={5} icon={NotebookPen} title="No session notes yet" description="Notes appear here after each session." />}
            {data?.map((n) => (
              <TableRow key={n.id}>
                <TableCell>{formatDate(n.session_date)}</TableCell>
                <TableCell>{THERAPY_LABELS[n.therapy_type]}</TableCell>
                <TableCell>{n.therapist?.full_name}</TableCell>
                <TableCell>
                  <StatusBadge status={n.is_locked ? 'signed' : 'draft'} />
                </TableCell>
                <TableCell className="text-right">
                  {n.appointment_id && (
                    <Button asChild variant="ghost" size="sm"><Link to={`/sessions/appointment/${n.appointment_id}`}>View</Link></Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PatientAssessments({ studentId }: { studentId: string }) {
  const { data, isLoading } = useAssessments({ branchId: null, studentId });
  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Form</TableHead>
              <TableHead>Therapist</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeleton cols={5} rows={3} />}
            {data?.length === 0 && <EmptyTableRow cols={5} icon={ClipboardList} title="No assessments yet" />}
            {data?.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{formatDate(a.assessment_date)}</TableCell>
                <TableCell>{a.form_templates?.name}</TableCell>
                <TableCell>{a.therapist?.full_name}</TableCell>
                <TableCell><StatusBadge status={a.status} /></TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm"><Link to={`/assessments/${a.id}`}>View</Link></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PatientReports({ studentId }: { studentId: string }) {
  const { data, isLoading } = useReports({ branchId: null, studentId });
  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Therapy</TableHead>
              <TableHead>Therapist</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeleton cols={5} rows={3} />}
            {data?.length === 0 && <EmptyTableRow cols={5} icon={FileBarChart} title="No progress reports yet" />}
            {data?.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{formatDate(r.period_start)} – {formatDate(r.period_end)}</TableCell>
                <TableCell>{THERAPY_LABELS[r.therapy_type]}</TableCell>
                <TableCell>{r.therapist?.full_name}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm"><Link to={`/reports/${r.id}`}>View</Link></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
