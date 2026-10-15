import { CalendarX2, Check, CheckCircle2, FilePenLine, FileText, Lock, UserCheck } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { THERAPY_STYLE, TherapyChip } from '@/components/common/TherapyChip';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Button } from '@/components/ui/button';
import { timeIn } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useMarkAttendance, type AgendaItem, type AttendanceStatus } from '../api';

const ATTENDANCE: { status: AttendanceStatus; label: string }[] = [
  { status: 'present', label: 'Present' },
  { status: 'late', label: 'Late' },
  { status: 'absent', label: 'Absent' },
];

type Step = 'done' | 'current' | 'todo' | 'skipped';

/** Where an appointment is in the session flow: arrive → note → sign. */
function flow(a: AgendaItem): { arrived: Step; note: Step; signed: Step } {
  const absent = a.attendance?.status === 'absent' || a.status === 'no_show';
  if (absent) return { arrived: 'skipped', note: 'skipped', signed: 'skipped' };
  const arrived: Step = a.attendance ? 'done' : 'current';
  const signed: Step = a.session?.is_locked ? 'done' : a.session ? 'current' : 'todo';
  const note: Step = a.session ? 'done' : a.attendance ? 'current' : 'todo';
  return { arrived, note, signed };
}

function FlowSteps({ a }: { a: AgendaItem }) {
  const f = flow(a);
  const steps: { key: keyof typeof f; label: string }[] = [
    { key: 'arrived', label: 'Arrived' },
    { key: 'note', label: 'Note' },
    { key: 'signed', label: 'Signed' },
  ];
  return (
    <ol className="flex items-center gap-1" aria-label="Session progress">
      {steps.map((s, i) => {
        const state = f[s.key];
        return (
          <li key={s.key} className="flex items-center gap-1">
            {i > 0 && <span className={cn('h-px w-3', state === 'done' ? 'bg-primary' : 'bg-border')} aria-hidden />}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold',
                state === 'done' && 'bg-accent text-primary',
                state === 'current' && 'bg-sunflower/30 text-sunflower-foreground ring-1 ring-sunflower/60 dark:text-sunflower',
                state === 'todo' && 'text-muted-foreground',
                state === 'skipped' && 'text-muted-foreground line-through',
              )}
            >
              {state === 'done' && <Check className="size-3" aria-hidden />}
              {s.label}
              <span className="sr-only">: {state}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * A day's appointments as a timeline, with one-tap check-in and the session-note action.
 * Used by My Day (therapist) and the Attendance page (therapist / branch admin).
 */
export function AgendaList({
  items,
  date,
  timeZone,
  showTherapist,
  canCheckIn,
  canWriteNotes,
  emptyText = 'No sessions on this day',
}: {
  items: AgendaItem[];
  date: string;
  timeZone: string;
  showTherapist?: boolean;
  canCheckIn: boolean;
  canWriteNotes: boolean;
  emptyText?: string;
}) {
  const mark = useMarkAttendance();

  const onMark = async (item: AgendaItem, status: AttendanceStatus) => {
    try {
      await mark.mutateAsync({ item, status, date });
      toast.success(`${item.student?.first_name} marked ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save attendance');
    }
  };

  if (!items.length) return <EmptyState icon={CalendarX2} title={emptyText} className="py-8" />;

  const now = Date.now();

  return (
    <ol className="relative">
      {items.map((a, idx) => {
        const cancelled = a.status === 'cancelled';
        const absent = a.attendance?.status === 'absent';
        const live = !cancelled && Date.parse(a.start_at) <= now && Date.parse(a.end_at) > now;
        const past = Date.parse(a.end_at) <= now;
        const signed = !!a.session?.is_locked;
        const style = THERAPY_STYLE[a.therapy_type] ?? THERAPY_STYLE.other;
        const name = `${a.student?.first_name ?? ''} ${a.student?.last_name ?? ''}`.trim();
        const last = idx === items.length - 1;

        return (
          <li key={a.id} className={cn('relative grid grid-cols-[3.75rem_1fr] gap-3 sm:grid-cols-[4.5rem_1fr] sm:gap-4', cancelled && 'opacity-55')}>
            {/* time + rail */}
            <div className="relative pt-3.5 text-right">
              <p className={cn('text-sm font-bold tabular-nums', live && 'text-primary')}>{timeIn(a.start_at, timeZone)}</p>
              <p className="text-[11px] text-muted-foreground tabular-nums">{timeIn(a.end_at, timeZone)}</p>
            </div>
            <div className="relative pb-3">
              <span
                className={cn(
                  'absolute top-4 -left-1.5 z-10 flex size-3 items-center justify-center rounded-full ring-4 ring-card',
                  live ? 'animate-pulse-ring bg-primary' : signed ? 'bg-primary' : past ? 'bg-muted-foreground/40' : 'border-2 border-primary/50 bg-card',
                )}
                aria-hidden
              />
              {items.length > 1 && (
                <span className={cn('absolute -left-px w-px bg-border', idx === 0 ? 'top-5' : 'top-0', last ? 'h-5' : 'bottom-0')} aria-hidden />
              )}

              <article
                className={cn(
                  'ml-2 overflow-hidden rounded-2xl border bg-card transition-shadow sm:ml-3',
                  live ? 'border-primary/50 shadow-lift ring-4 ring-primary/10' : 'border-border/70 hover:shadow-soft',
                )}
              >
                <div className="flex">
                  <span className={cn('w-1 shrink-0', style.bar)} aria-hidden />
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-3 p-3 sm:p-3.5">
                    <Link to={`/students/${a.student_id}`} className="flex min-w-44 flex-1 items-center gap-3">
                      <UserAvatar name={name} className="size-10" />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-bold hover:underline">{name || 'Patient'}</span>
                          {live && <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-bold text-primary-foreground uppercase">Now</span>}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <TherapyChip type={a.therapy_type} short />
                          {showTherapist && a.therapist && <span className="truncate text-xs text-muted-foreground">with {a.therapist.full_name}</span>}
                        </span>
                      </span>
                    </Link>

                    {cancelled ? (
                      <StatusBadge status="cancelled" />
                    ) : (
                      <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:items-end">
                        <FlowSteps a={a} />
                        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                          {canCheckIn && (
                            <div className="flex w-full rounded-xl bg-muted p-1 sm:w-auto" role="group" aria-label="Attendance">
                              {ATTENDANCE.map(({ status, label }) => {
                                const on = a.attendance?.status === status;
                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => onMark(a, status)}
                                    disabled={mark.isPending || signed}
                                    aria-pressed={on}
                                    className={cn(
                                      'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all disabled:opacity-50 sm:flex-none sm:px-2.5 sm:py-1 sm:text-xs',
                                      on
                                        ? status === 'absent'
                                          ? 'bg-destructive text-white shadow-sm'
                                          : 'bg-card text-primary shadow-sm ring-1 ring-primary/20'
                                        : 'text-muted-foreground hover:text-foreground',
                                    )}
                                  >
                                    {on && status !== 'absent' && <UserCheck className="mr-1 inline size-3.5" aria-hidden />}
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {!canCheckIn && a.attendance && <StatusBadge status={a.attendance.status} />}

                          {canWriteNotes &&
                            !absent &&
                            (signed ? (
                              <Button asChild variant="ghost" size="sm">
                                <Link to={`/sessions/appointment/${a.id}`}>
                                  <CheckCircle2 className="text-primary" /> Signed
                                </Link>
                              </Button>
                            ) : (
                              <Button asChild variant={a.session ? 'outline' : a.attendance ? 'default' : 'outline'} size="sm" className="flex-1 sm:flex-none">
                                <Link to={`/sessions/appointment/${a.id}`}>
                                  {a.session ? <FileText /> : <FilePenLine />}
                                  {a.session ? 'Continue note' : 'Write note'}
                                </Link>
                              </Button>
                            ))}
                          {!canWriteNotes && a.session && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              {a.session.is_locked ? <Lock className="size-3" aria-hidden /> : <FileText className="size-3" aria-hidden />}
                              {a.session.is_locked ? 'Note signed' : 'Note in draft'}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
