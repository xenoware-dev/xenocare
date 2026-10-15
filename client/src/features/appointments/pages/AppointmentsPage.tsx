import { Ban, CalendarDays, CalendarX2, CheckCircle2, Plus, Repeat, UserX } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { ListSkeleton } from '@/components/common/Skeletons';
import { StatusBadge } from '@/components/common/StatusBadge';
import { THERAPY_STYLE, TherapyChip } from '@/components/common/TherapyChip';
import { UserAvatar } from '@/components/common/UserAvatar';
import { WeekStrip } from '@/components/common/WeekStrip';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranch';
import { useOpenFromQuery } from '@/hooks/useOpenFromQuery';
import { usePermission } from '@/hooks/usePermission';
import { timeIn, todayIn } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useAppointments, useSetAppointmentStatus, type AppointmentRow, type AppointmentStatus } from '../api';
import { NewAppointmentDialog } from '../components/NewAppointmentDialog';

const DEFAULT_TZ = 'Asia/Kolkata';
const ALL = '__all__';

export function AppointmentsPage() {
  const { profile } = useAuth();
  const { branchId, branch, isAll } = useBranch();
  const canManage = usePermission('appointments.manage');
  const timeZone = branch?.timezone ?? DEFAULT_TZ;
  const today = todayIn(timeZone);
  const [date, setDate] = useState(today);
  const [therapist, setTherapist] = useState(ALL);
  const [booking, setBooking] = useState(false);
  useOpenFromQuery(useCallback(() => setBooking(true), []), canManage && !!branch);
  const { data, isLoading, error } = useAppointments({ branchId: isAll ? null : branchId, date, timeZone });
  const setStatus = useSetAppointmentStatus();
  const confirm = useConfirm();

  const isTherapist = profile?.role === 'therapist';
  const open = (a: AppointmentRow) => a.status === 'scheduled' || a.status === 'confirmed';

  const therapists = useMemo(() => [...new Set((data ?? []).map((a) => a.therapist?.full_name).filter(Boolean) as string[])].sort(), [data]);
  const rows = (data ?? []).filter((a) => therapist === ALL || a.therapist?.full_name === therapist);
  const active = rows.filter((a) => a.status !== 'cancelled');
  const completed = rows.filter((a) => a.status === 'completed').length;
  const missed = rows.filter((a) => a.status === 'no_show').length;

  const update = async (a: AppointmentRow, status: AppointmentStatus) => {
    let reason: string | undefined;
    if (status === 'cancelled') {
      const res = await confirm({
        title: `Cancel ${a.students?.first_name ?? 'this'}'s appointment?`,
        description: `${timeIn(a.start_at, timeZone)} with ${a.therapist?.full_name ?? 'the therapist'}.`,
        confirmLabel: 'Cancel appointment',
        cancelLabel: 'Keep it',
        destructive: true,
        reason: { label: 'Reason (optional)', placeholder: 'e.g. Parent requested, child unwell' },
      });
      if (!res.ok) return;
      reason = res.reason || undefined;
    }
    try {
      await setStatus.mutateAsync({ id: a.id, status, reason });
      toast.success(`Marked ${status.replace('_', ' ')}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update appointment');
    }
  };

  const now = Date.now();

  return (
    <>
      <PageHeader
        eyebrow="Clinic"
        title={isTherapist ? 'My schedule' : 'Appointments'}
        icon={CalendarDays}
        description={
          canManage
            ? 'Book therapists and patients for your branch'
            : isTherapist
              ? 'Your sessions. Mark them completed or no-show afterwards.'
              : 'Schedules across branches (booked by branch admins)'
        }
        actions={
          canManage &&
          branch && (
            <Button size="lg" onClick={() => setBooking(true)}>
              <Plus /> New appointment
            </Button>
          )
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_18rem]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardContent>
              <WeekStrip date={date} today={today} onChange={setDate} />
            </CardContent>
          </Card>

          {!isTherapist && therapists.length > 1 && (
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-none lg:mx-0 lg:px-0" role="tablist" aria-label="Filter by therapist">
              {[ALL, ...therapists].map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={therapist === t}
                  onClick={() => setTherapist(t)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 rounded-full border py-1 pr-3.5 text-sm font-semibold transition-colors',
                    t === ALL ? 'pl-3.5' : 'pl-1',
                    therapist === t ? 'border-brand-ink bg-brand-ink text-white dark:border-primary dark:bg-primary dark:text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t !== ALL && <UserAvatar name={t} className="size-6 text-[9px]" />}
                  {t === ALL ? 'All therapists' : t.split(' ')[0]}
                </button>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error.message}</p>}

          {isLoading ? (
            <Card>
              <CardContent>
                <ListSkeleton rows={4} />
              </CardContent>
            </Card>
          ) : rows.length === 0 ? (
            <Card>
              <EmptyState
                icon={CalendarX2}
                title="Nothing booked on this day"
                description={canManage ? 'Book a session for a patient and therapist.' : undefined}
                action={canManage && branch ? <Button size="sm" onClick={() => setBooking(true)}><Plus /> New appointment</Button> : undefined}
              />
            </Card>
          ) : (
            <ul className="space-y-2.5">
              {rows.map((a) => {
                const name = `${a.students?.first_name ?? ''} ${a.students?.last_name ?? ''}`.trim();
                const live = open(a) && Date.parse(a.start_at) <= now && Date.parse(a.end_at) > now;
                return (
                  <li
                    key={a.id}
                    className={cn(
                      'flex overflow-hidden rounded-2xl border bg-card shadow-soft transition-shadow hover:shadow-lift',
                      live ? 'border-primary/50 ring-4 ring-primary/10' : 'border-border/70',
                      a.status === 'cancelled' && 'opacity-55',
                    )}
                  >
                    <span className={cn('w-1.5 shrink-0', THERAPY_STYLE[a.therapy_type]?.bar)} aria-hidden />
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-3 p-3.5 sm:p-4">
                      <div className="w-24 shrink-0 whitespace-nowrap">
                        <p className={cn('font-display text-lg leading-tight font-extrabold tabular-nums', live && 'text-primary')}>{timeIn(a.start_at, timeZone)}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          to {timeIn(a.end_at, timeZone)}
                          {a.recurrence_group_id && <Repeat className="ml-1 inline size-3" aria-label="Recurring" />}
                        </p>
                      </div>
                      <Link to={`/students/${a.student_id}`} className="group flex min-w-44 flex-1 items-center gap-3">
                        <UserAvatar name={name} className="size-10" />
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-bold group-hover:text-primary">{name || 'Patient'}</span>
                            {live && <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-bold text-primary-foreground uppercase">Now</span>}
                          </span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <TherapyChip type={a.therapy_type} short />
                            {!isTherapist && a.therapist && <span>with {a.therapist.full_name}</span>}
                            {isAll && a.branches && <span>· {a.branches.name}</span>}
                          </span>
                        </span>
                      </Link>
                      <div className="flex w-full items-center gap-2 sm:w-auto">
                        {!open(a) && <StatusBadge status={a.status} />}
                        {open(a) && (canManage || isTherapist) && (
                          <>
                            <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => update(a, 'completed')} disabled={setStatus.isPending}>
                              <CheckCircle2 className="text-success" /> Done
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => update(a, 'no_show')} disabled={setStatus.isPending}>
                              <UserX className="text-warning" /> No-show
                            </Button>
                          </>
                        )}
                        {open(a) && canManage && (
                          <Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-danger-soft hover:text-destructive" onClick={() => update(a, 'cancelled')} disabled={setStatus.isPending} aria-label="Cancel appointment">
                            <Ban />
                          </Button>
                        )}
                        {open(a) && !canManage && !isTherapist && <StatusBadge status={a.status} />}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="gap-4">
            <CardContent className="space-y-4">
              <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">Day summary</p>
              <div className="grid grid-cols-3 gap-2 text-center xl:grid-cols-1 xl:text-left">
                <Summary label="Booked" value={active.length} />
                <Summary label="Completed" value={completed} tone="text-success" />
                <Summary label="No-show" value={missed} tone={missed ? 'text-destructive' : undefined} />
              </div>
              {active.length > 0 && (
                <div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${(completed / active.length) * 100}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{Math.round((completed / active.length) * 100)}% of the day completed</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="hidden gap-3 xl:flex">
            <CardContent className="space-y-2">
              <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">Therapy colours</p>
              {(Object.keys(THERAPY_STYLE) as (keyof typeof THERAPY_STYLE)[]).map((t) => (
                <div key={t}>
                  <TherapyChip type={t} />
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
      {branch && <NewAppointmentDialog branch={branch} date={date} open={booking} onOpenChange={setBooking} />}
    </>
  );
}

function Summary({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-2.5 xl:flex xl:items-center xl:justify-between">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className={cn('font-display text-2xl font-extrabold tabular-nums', tone)}>{value}</p>
    </div>
  );
}
