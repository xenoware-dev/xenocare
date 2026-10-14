import { CalendarDays, CalendarX2, ChevronLeft, ChevronRight, Plus, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ListSkeleton } from '@/components/common/Skeletons';
import { EmptyState } from '@/components/common/EmptyState';
import { useOpenFromQuery } from '@/hooks/useOpenFromQuery';
import { EmptyTableRow, TableSkeleton } from '@/components/common/Skeletons';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useConfirm } from '@/components/common/ConfirmDialog';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranch';
import { usePermission } from '@/hooks/usePermission';
import { addDays, timeIn, todayIn } from '@/lib/time';
import { THERAPY_LABELS } from '@/types/app';
import { useAppointments, useSetAppointmentStatus, type AppointmentRow, type AppointmentStatus } from '../api';
import { NewAppointmentDialog } from '../components/NewAppointmentDialog';

const DEFAULT_TZ = 'Asia/Kolkata';
export function AppointmentsPage() {
  const { profile } = useAuth();
  const { branchId, branch, isAll } = useBranch();
  const canManage = usePermission('appointments.manage');
  const timeZone = branch?.timezone ?? DEFAULT_TZ;
  const [date, setDate] = useState(() => todayIn(timeZone));
  const [booking, setBooking] = useState(false);
  useOpenFromQuery(useCallback(() => setBooking(true), []), canManage && !!branch);
  const { data, isLoading, error } = useAppointments({ branchId: isAll ? null : branchId, date, timeZone });
  const setStatus = useSetAppointmentStatus();
  const confirm = useConfirm();

  const isTherapist = profile?.role === 'therapist';
  const open = (a: AppointmentRow) => a.status === 'scheduled' || a.status === 'confirmed';

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

  const dayLabel = new Intl.DateTimeFormat('en-IN', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

  return (
    <>
      <PageHeader
        title={isTherapist ? 'My schedule' : 'Appointments'}
        icon={CalendarDays}
        description={
          canManage
            ? 'Book therapists and patients for your branch'
            : isTherapist
              ? 'Your appointments. Mark them completed or no-show after the session.'
              : 'Schedules across branches (booked by branch admins)'
        }
        actions={
          canManage &&
          branch && (
            <Button onClick={() => setBooking(true)}>
              <Plus /> New appointment
            </Button>
          )
        }
      />
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
              <ChevronLeft />
            </Button>
            <Button variant="outline" onClick={() => setDate(todayIn(timeZone))}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, 1))} aria-label="Next day">
              <ChevronRight />
            </Button>
            <Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-auto" aria-label="Date" />
            <span className="text-sm font-medium">{dayLabel}</span>
          </div>

          {error && <p className="text-sm text-destructive">{error.message}</p>}
          {/* Phones: cards */}
          <div className="space-y-2 md:hidden">
            {isLoading && <ListSkeleton rows={3} />}
            {data?.length === 0 && (
              <EmptyState
                icon={CalendarX2}
                title="No appointments on this day"
                action={canManage && branch ? <Button size="sm" onClick={() => setBooking(true)}><Plus /> New appointment</Button> : undefined}
              />
            )}
            {data?.map((a) => (
              <article key={a.id} className={cn('rounded-xl border bg-card p-3.5', a.status === 'cancelled' && 'opacity-60')}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold tabular-nums">
                    {timeIn(a.start_at, timeZone)} – {timeIn(a.end_at, timeZone)}
                    {a.recurrence_group_id && <Repeat className="ml-1 inline size-3 text-muted-foreground" aria-label="Recurring" />}
                  </span>
                  <StatusBadge status={a.status} />
                </div>
                <p className="mt-1.5 font-medium">{a.students?.first_name} {a.students?.last_name}</p>
                <p className="text-xs text-muted-foreground">
                  {THERAPY_LABELS[a.therapy_type]}
                  {!isTherapist && a.therapist && ` · ${a.therapist.full_name}`}
                  {isAll && a.branches && ` · ${a.branches.name}`}
                </p>
                {open(a) && (canManage || isTherapist) && (
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => update(a, 'completed')} disabled={setStatus.isPending}>
                      Completed
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => update(a, 'no_show')} disabled={setStatus.isPending}>
                      No-show
                    </Button>
                    {canManage && (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => update(a, 'cancelled')} disabled={setStatus.isPending}>
                        Cancel
                      </Button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Patient</TableHead>
                  {!isTherapist && <TableHead>Therapist</TableHead>}
                  <TableHead>Therapy</TableHead>
                  {isAll && <TableHead>Branch</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeleton cols={7} />}
                {data?.length === 0 && (
                  <EmptyTableRow
                    cols={7}
                    icon={CalendarX2}
                    title="No appointments on this day"
                    description={canManage ? 'Book a session for a patient and therapist.' : undefined}
                    action={canManage && branch ? <Button size="sm" onClick={() => setBooking(true)}><Plus /> New appointment</Button> : undefined}
                  />
                )}
                {data?.map((a) => (
                  <TableRow key={a.id} className={a.status === 'cancelled' ? 'opacity-60' : undefined}>
                    <TableCell className="whitespace-nowrap">
                      {timeIn(a.start_at, timeZone)} – {timeIn(a.end_at, timeZone)}
                      {a.recurrence_group_id && <Repeat className="ml-1 inline size-3 text-muted-foreground" aria-label="Recurring" />}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{a.students?.first_name} {a.students?.last_name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{a.students?.student_code}</div>
                    </TableCell>
                    {!isTherapist && <TableCell>{a.therapist?.full_name}</TableCell>}
                    <TableCell>{THERAPY_LABELS[a.therapy_type]}</TableCell>
                    {isAll && <TableCell>{a.branches?.name}</TableCell>}
                    <TableCell>
                      <StatusBadge status={a.status} />
                    </TableCell>
                    <TableCell className="space-x-1 text-right whitespace-nowrap">
                      {open(a) && (canManage || isTherapist) && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => update(a, 'completed')} disabled={setStatus.isPending}>
                            Completed
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => update(a, 'no_show')} disabled={setStatus.isPending}>
                            No-show
                          </Button>
                        </>
                      )}
                      {open(a) && canManage && (
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => update(a, 'cancelled')} disabled={setStatus.isPending}>
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {branch && <NewAppointmentDialog branch={branch} date={date} open={booking} onOpenChange={setBooking} />}
    </>
  );
}
