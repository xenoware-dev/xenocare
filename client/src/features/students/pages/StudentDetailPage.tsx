import { ArrowLeft, Cake, CalendarDays, CalendarPlus, ClipboardList, FileBarChart, MapPin, MessageCircle, NotebookPen, Phone, ShieldAlert, Target, UserRound } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { TherapyChip } from '@/components/common/TherapyChip';
import { cn } from '@/lib/utils';
import { ageOf } from '../age';
import { UserAvatar } from '@/components/common/UserAvatar';
import { EmptyTableRow, TableSkeleton } from '@/components/common/Skeletons';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Link, useNavigate, useParams } from 'react-router';
import { LoadingScreen } from '@/components/common/LoadingScreen';
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

export function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const canPlan = usePermission('plans.write');
  const canAssess = usePermission('assessments.write');
  const canReport = usePermission('reports.write');
  const canBook = usePermission('appointments.manage');
  const { data: s, isLoading, error } = useStudent(id);

  if (isLoading) return <LoadingScreen />;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;
  if (!s) return <EmptyState icon={UserRound} title="Patient not found" description="This patient doesn't exist, or you are not on their care team." />;

  const care = s.student_therapists.filter((t) => !t.end_date);
  const mine = care.find((t) => t.therapist_id === profile?.id);
  // New plans belong to the signed-in therapist; an admin creates them for the first care-team therapist.
  const planOwner = mine
    ? { id: mine.therapist_id, therapy_type: mine.therapy_type }
    : profile?.role === 'admin' && care[0]
      ? { id: care[0].therapist_id, therapy_type: care[0].therapy_type }
      : null;
  const years = ageOf(s.date_of_birth);
  const name = `${s.first_name} ${s.last_name ?? ''}`.trim();
  const primary = s.student_parents.find((p) => p.is_primary_contact) ?? s.student_parents[0];
  const primaryPhone = primary?.parents?.whatsapp_number ?? primary?.parents?.phone;
  const types = [...new Set(care.map((t) => t.therapy_type))];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate(-1)}>
        <ArrowLeft /> Back
      </Button>

      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-hero p-5 shadow-soft sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-dots opacity-50 [mask-image:linear-gradient(to_left,black,transparent_55%)]" aria-hidden />
        <div className="relative flex flex-wrap items-start gap-5">
          <UserAvatar name={name} className="size-20 text-2xl ring-4 ring-card sm:size-24" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[1.7rem] leading-tight font-extrabold tracking-tight sm:text-4xl">{name}</h1>
              <StatusBadge status={s.status} />
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="rounded-md bg-card/80 px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground ring-1 ring-border">{s.student_code}</span>
              {years !== null && <span className="inline-flex items-center gap-1"><Cake className="size-3.5" aria-hidden /> {years} years</span>}
              {s.gender !== 'unspecified' && <span className="capitalize">{s.gender}</span>}
              {s.branches?.name && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden /> {s.branches.name}</span>}
              <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" aria-hidden /> Since {formatDate(s.intake_date)}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {types.map((t) => <TherapyChip key={t} type={t} />)}
              {s.diagnosis.map((d) => (
                <span key={d} className="rounded-full border bg-card/70 px-2 py-0.5 text-xs font-semibold">{d}</span>
              ))}
            </div>
          </div>

          <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:max-w-xs lg:justify-end">
            {canBook && (
              <Button asChild>
                <Link to="/appointments?new=1"><CalendarPlus /> Book session</Link>
              </Button>
            )}
            {canAssess && (
              <Button asChild variant="outline">
                <Link to={`/assessments/new?student=${s.id}`}><ClipboardList /> Assessment</Link>
              </Button>
            )}
            {canReport && (
              <Button asChild variant="outline">
                <Link to={`/reports/new?student=${s.id}`}><FileBarChart /> Progress report</Link>
              </Button>
            )}
            {primaryPhone && (
              <>
                <Button asChild variant="outline" size="icon" aria-label={`Call ${primary?.parents?.full_name}`}>
                  <a href={`tel:${primaryPhone}`}><Phone /></a>
                </Button>
                <Button asChild variant="outline" size="icon" aria-label={`WhatsApp ${primary?.parents?.full_name}`}>
                  <a href={`https://wa.me/${primaryPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><MessageCircle className="text-success" /></a>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {(s.allergies || s.medications) && (
        <div className="flex flex-wrap items-start gap-x-6 gap-y-2 rounded-2xl border border-destructive/25 bg-danger-soft px-4 py-3 text-sm" role="note">
          <span className="inline-flex items-center gap-2 font-bold text-destructive">
            <ShieldAlert className="size-4" aria-hidden /> Before the session
          </span>
          {s.allergies && <span><span className="font-semibold">Allergies:</span> {s.allergies}</span>}
          {s.medications && <span><span className="font-semibold">Medications:</span> {s.medications}</span>}
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto scrollbar-none sm:w-auto">
          <TabsTrigger value="overview"><UserRound /> Overview</TabsTrigger>
          <TabsTrigger value="plan"><Target /> Plan & goals</TabsTrigger>
          <TabsTrigger value="sessions"><NotebookPen /> Sessions</TabsTrigger>
          <TabsTrigger value="assessments"><ClipboardList /> Assessments</TabsTrigger>
          <TabsTrigger value="reports"><FileBarChart /> Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Care team</CardTitle></CardHeader>
              <CardContent>
                {care.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No therapist assigned.</p>
                ) : (
                  <ul className="space-y-3">
                    {care.map((t) => (
                      <li key={`${t.therapist_id}-${t.therapy_type}`} className="flex items-center gap-3">
                        <UserAvatar name={t.profiles?.full_name} className="size-10" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">
                            {t.profiles?.full_name}
                            {t.therapist_id === profile?.id && <span className="ml-1.5 text-xs font-semibold text-primary">(you)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">since {formatDate(t.start_date)}</p>
                        </div>
                        <TherapyChip type={t.therapy_type} short />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Family</CardTitle></CardHeader>
              <CardContent>
                {s.student_parents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No parent recorded.</p>
                ) : (
                  <ul className="space-y-3">
                    {s.student_parents.map((p, i) => {
                      const phone = p.parents?.whatsapp_number ?? p.parents?.phone;
                      return (
                        <li key={i} className="flex items-center gap-3">
                          <UserAvatar name={p.parents?.full_name} className="size-10" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">
                              {p.parents?.full_name}
                              {p.is_primary_contact && <span className="ml-1.5 rounded-full bg-accent px-1.5 py-px text-[10px] font-bold text-primary uppercase">Primary</span>}
                            </p>
                            <p className="truncate text-xs text-muted-foreground capitalize">
                              {p.relationship}
                              {phone && <span className="normal-case"> · {phone}</span>}
                            </p>
                          </div>
                          {phone && (
                            <span className="flex gap-1">
                              <Button asChild variant="outline" size="icon-sm" aria-label={`Call ${p.parents?.full_name}`}>
                                <a href={`tel:${phone}`}><Phone /></a>
                              </Button>
                              <Button asChild variant="outline" size="icon-sm" aria-label={`WhatsApp ${p.parents?.full_name}`}>
                                <a href={`https://wa.me/${phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><MessageCircle className="text-success" /></a>
                              </Button>
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Medical & background</CardTitle></CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <Info label="Medical history" value={s.medical_history} />
                <Info label="Allergies" value={s.allergies} alert />
                <Info label="Medications" value={s.medications} alert />
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

function Info({ label, value, alert }: { label: string; value: string | null; alert?: boolean }) {
  return (
    <div className={cn('rounded-xl p-3', alert && value ? 'bg-danger-soft' : 'bg-muted/50')}>
      <p className={cn('text-[11px] font-bold tracking-wider uppercase', alert && value ? 'text-destructive' : 'text-muted-foreground')}>{label}</p>
      <p className="mt-1 whitespace-pre-line">{value || <span className="text-muted-foreground">—</span>}</p>
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
