import { CalendarX2, CheckCircle2, FilePenLine, FileText } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { timeIn } from '@/lib/time';
import { cn } from '@/lib/utils';
import { THERAPY_LABELS } from '@/types/app';
import { useMarkAttendance, type AgendaItem, type AttendanceStatus } from '../api';

const ATTENDANCE: { status: AttendanceStatus; label: string }[] = [
  { status: 'present', label: 'Present' },
  { status: 'late', label: 'Late' },
  { status: 'absent', label: 'Absent' },
];

/**
 * A day's appointments with one-tap check-in and the session-note action.
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
      toast.success(`${item.student?.first_name}: ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save attendance');
    }
  };

  if (!items.length) return <EmptyState icon={CalendarX2} title={emptyText} className="py-8" />;

  return (
    <ul className="divide-y">
      {items.map((a) => {
        const cancelled = a.status === 'cancelled';
        const absent = a.attendance?.status === 'absent';
        return (
          <li key={a.id} className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 py-3', cancelled && 'opacity-60')}>
            <div className="w-28 shrink-0 text-sm tabular-nums">
              <div className="font-medium">{timeIn(a.start_at, timeZone)}</div>
              <div className="text-xs text-muted-foreground">to {timeIn(a.end_at, timeZone)}</div>
            </div>
            <div className="min-w-40 flex-1">
              <Link to={`/students/${a.student_id}`} className="font-medium hover:underline">
                {a.student?.first_name} {a.student?.last_name}
              </Link>
              <div className="text-xs text-muted-foreground">
                {THERAPY_LABELS[a.therapy_type]}
                {showTherapist && a.therapist && ` · ${a.therapist.full_name}`}
              </div>
            </div>

            {cancelled ? (
              <StatusBadge status="cancelled" />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {canCheckIn && (
                  <div className="flex rounded-md border p-0.5" role="group" aria-label="Attendance">
                    {ATTENDANCE.map(({ status, label }) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => onMark(a, status)}
                        disabled={mark.isPending || a.session?.is_locked}
                        aria-pressed={a.attendance?.status === status}
                        className={cn(
                          'rounded px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50',
                          a.attendance?.status === status
                            ? status === 'absent'
                              ? 'bg-destructive text-white'
                              : 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                {!canCheckIn && a.attendance && <StatusBadge status={a.attendance.status} />}

                {canWriteNotes && !absent && (
                  a.session?.is_locked ? (
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/sessions/appointment/${a.id}`}>
                        <CheckCircle2 className="text-primary" /> Signed
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild variant={a.session ? 'outline' : 'default'} size="sm">
                      <Link to={`/sessions/appointment/${a.id}`}>
                        {a.session ? <FileText /> : <FilePenLine />}
                        {a.session ? 'Continue note' : 'Write note'}
                      </Link>
                    </Button>
                  )
                )}
                {!canWriteNotes && a.session && (
                  <StatusBadge status={a.session.is_locked ? 'signed' : 'draft'} label={a.session.is_locked ? 'Note signed' : 'Note draft'} />
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
