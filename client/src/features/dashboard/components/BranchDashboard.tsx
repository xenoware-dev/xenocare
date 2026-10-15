import {
  AlertCircle,
  CalendarCheck,
  CalendarPlus,
  ClipboardCheck,
  FilePenLine,
  FileText,
  Plane,
  Target,
  UserCheck,
  UserPlus,
  UserRoundPlus,
  UserX,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { DayHero, firstName, greeting } from '@/components/common/DayHero';
import { ProgressRing } from '@/components/common/ProgressRing';
import { StatSkeleton } from '@/components/common/Skeletons';
import { StatCard } from '@/components/common/StatCard';
import { TonePill, type Tone } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgenda } from '@/features/sessions/api';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranch';
import { usePermission } from '@/hooks/usePermission';
import { formatDate } from '@/lib/format';
import { todayIn } from '@/lib/time';
import { useAttention, useTrends } from '../api';
import { AttendanceTrend, WorkloadBars } from './Charts';
import { ScheduleBoard } from './ScheduleBoard';

export { greeting };

/** Branch admin's day (also the owner's view when one branch is selected). */
export function BranchDashboard() {
  const { profile } = useAuth();
  const { branchId, branch, isAll } = useBranch();
  const scopeId = isAll ? null : branchId;
  const tz = branch?.timezone ?? 'Asia/Kolkata';
  const today = todayIn(tz);
  const canBook = usePermission('appointments.manage');
  const canAddPatient = usePermission('students.manage');
  const canAddStaff = usePermission('staff.manage');

  const agenda = useAgenda({ date: today, timeZone: tz, branchId: scopeId });
  const attention = useAttention(scopeId, today);
  const trends = useTrends(scopeId, today);

  const sessions = (agenda.data ?? []).filter((a) => a.status !== 'cancelled');
  const done = sessions.filter((a) => a.status === 'completed').length;
  const checkedIn = sessions.filter((a) => a.attendance && a.attendance.status !== 'absent').length;
  const missed = sessions.filter((a) => a.status === 'no_show' || a.attendance?.status === 'absent').length;
  const onLeave = attention.data?.leaveToday ?? [];

  return (
    <>
      <DayHero
        eyebrow={`${branch?.name ?? 'Your branch'} · ${new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz }).format(new Date())}`}
        title={
          <>
            {greeting()}, <span className="text-primary">{firstName(profile?.full_name)}</span>
          </>
        }
        description={
          agenda.isLoading
            ? 'Loading today…'
            : sessions.length
              ? `${sessions.length} sessions on the board today · ${checkedIn} checked in so far${missed ? ` · ${missed} missed` : ''}.`
              : 'Nothing is booked for today yet.'
        }
        actions={
          <>
            {canBook && (
              <Button asChild size="lg">
                <Link to="/appointments?new=1"><CalendarPlus /> Book appointment</Link>
              </Button>
            )}
            <Button asChild size="lg" variant="outline">
              <Link to="/attendance"><UserCheck /> Check-in desk</Link>
            </Button>
            {canAddPatient && (
              <Button asChild size="lg" variant="ghost">
                <Link to="/students?new=1"><UserRoundPlus /> New patient</Link>
              </Button>
            )}
          </>
        }
        aside={
          sessions.length > 0 && (
            <ProgressRing value={done / sessions.length} size={120} stroke={11} label={`${done} of ${sessions.length} sessions completed`}>
              <span className="font-display text-3xl font-extrabold tabular-nums">{Math.round((done / sessions.length) * 100)}%</span>
              <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">day done</span>
            </ProgressRing>
          )
        }
        className="mb-6"
      />

      <div className="space-y-6">
        {agenda.isLoading ? (
          <StatSkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard label="Sessions today" value={String(sessions.length)} icon={CalendarCheck} hint={`${done} done · ${Math.max(0, sessions.length - done - missed)} to go`} to="/appointments" />
            <StatCard label="Checked in" value={`${checkedIn}/${sessions.length}`} icon={UserCheck} tone="success" to="/attendance" progress={sessions.length ? checkedIn / sessions.length : 0} />
            <StatCard label="Absent / no-show" value={String(missed)} icon={UserX} tone={missed ? 'danger' : 'neutral'} hint={missed ? 'Follow up with parents' : 'Everyone came'} to="/attendance" />
            <StatCard
              label="On leave today"
              value={String(onLeave.length)}
              icon={Plane}
              tone={onLeave.length ? 'warning' : 'neutral'}
              hint={onLeave.length ? onLeave.map((l) => l.name.split(' ')[0]).join(', ') : 'Full team in'}
              to="/staff"
            />
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
          <Card className="min-w-0">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Today's schedule</CardTitle>
                <CardDescription>By therapist. Click a card to open the patient.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/attendance">Check-in</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {agenda.isLoading ? (
                <div className="flex gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 w-64 rounded-xl" />)}</div>
              ) : (
                <ScheduleBoard items={agenda.data ?? []} timeZone={tz} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Needs attention</CardTitle>
              <CardDescription>Things to sort out today</CardDescription>
            </CardHeader>
            <CardContent>
              {attention.isLoading ? (
                <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : attention.error ? (
                <p className="text-sm text-destructive">{attention.error.message}</p>
              ) : (
                <AttentionList a={attention.data!} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Attendance</CardTitle>
              <CardDescription>Share of sessions attended, last 4 weeks</CardDescription>
            </CardHeader>
            <CardContent>{trends.data ? <AttendanceTrend weeks={trends.data.weeks} /> : <Skeleton className="h-44" />}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Therapist workload</CardTitle>
              <CardDescription>Completed sessions this month</CardDescription>
            </CardHeader>
            <CardContent>{trends.data ? <WorkloadBars rows={trends.data.workload} /> : <Skeleton className="h-44" />}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Patients</CardTitle>
              <CardDescription>Active caseload</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {trends.data ? (
                <>
                  <div>
                    <p className="font-display text-5xl font-extrabold tabular-nums">{trends.data.activePatients}</p>
                    <p className="text-sm text-muted-foreground">active patients</p>
                  </div>
                  <p className="text-sm">
                    <TonePill tone="success">+{trends.data.newPatients}</TonePill> <span className="text-muted-foreground">registered this month</span>
                  </p>
                </>
              ) : (
                <Skeleton className="h-24" />
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" asChild><Link to="/students"><Users /> All patients</Link></Button>
                {canAddStaff && (
                  <Button variant="outline" size="sm" asChild><Link to="/staff?new=1"><UserPlus /> Add therapist</Link></Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function AttentionItem({
  icon: Icon,
  tone,
  title,
  detail,
  to,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  detail?: string;
  to: string;
}) {
  const toneClass: Record<Tone, string> = {
    primary: 'bg-accent text-primary',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    info: 'bg-info-soft text-info',
    danger: 'bg-danger-soft text-destructive',
    neutral: 'bg-muted text-muted-foreground',
  };
  return (
    <li>
      <Link to={to} className="group -mx-2 flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${toneClass[tone]}`}>
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{title}</span>
          {detail && <span className="block truncate text-xs text-muted-foreground">{detail}</span>}
        </span>
      </Link>
    </li>
  );
}

function AttentionList({ a }: { a: NonNullable<ReturnType<typeof useAttention>['data']> }) {
  const unsigned = a.unsignedByTherapist.reduce((n, t) => n + t.count, 0);
  const items = [
    a.pendingLeave > 0 && (
      <AttentionItem key="leave" icon={Plane} tone="warning" title={`${a.pendingLeave} leave request${a.pendingLeave > 1 ? 's' : ''} to review`} to="/staff" />
    ),
    unsigned > 0 && (
      <AttentionItem
        key="notes"
        icon={FilePenLine}
        tone="danger"
        title={`${unsigned} session note${unsigned > 1 ? 's' : ''} unsigned for 2+ days`}
        detail={a.unsignedByTherapist.map((t) => `${t.therapist} (${t.count})`).join(', ')}
        to="/sessions"
      />
    ),
    a.unbookedPatients.length > 0 && (
      <AttentionItem
        key="unbooked"
        icon={AlertCircle}
        tone="info"
        title={`${a.unbookedPatients.length} active patient${a.unbookedPatients.length > 1 ? 's have' : ' has'} nothing booked`}
        detail={a.unbookedPatients.slice(0, 3).map((p) => p.name).join(', ')}
        to="/appointments?new=1"
      />
    ),
    ...a.plansDue.slice(0, 3).map((p) => (
      <AttentionItem key={p.id} icon={Target} tone="warning" title={`Plan review due: ${p.student}`} detail={`${p.title} · ${formatDate(p.review_date)}`} to={`/students/${p.student_id}`} />
    )),
    a.draftReports > 0 && (
      <AttentionItem key="reports" icon={FileText} tone="neutral" title={`${a.draftReports} progress report${a.draftReports > 1 ? 's' : ''} in draft`} to="/reports" />
    ),
  ].filter(Boolean);

  if (!items.length) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <span className="mb-2 flex size-10 items-center justify-center rounded-full bg-success-soft text-success">
          <ClipboardCheck className="size-5" aria-hidden />
        </span>
        <p className="text-sm font-medium">All clear</p>
        <p className="text-xs text-muted-foreground">Nothing needs your attention right now.</p>
      </div>
    );
  }
  return <ul className="space-y-1">{items}</ul>;
}
