import {
  Ban,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  CircleSlash,
  Clock,
  Lock,
  PauseCircle,
  PenLine,
  RefreshCw,
  Target,
  UserCheck,
  UserX,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type Tone = 'success' | 'warning' | 'info' | 'danger' | 'neutral' | 'primary';

const TONE_CLASS: Record<Tone, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
  danger: 'bg-danger-soft text-destructive',
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-accent text-accent-foreground',
};

/** Every status the app shows, with a consistent colour + icon + label (never colour alone). */
const STATUS: Record<string, { label: string; tone: Tone; icon: LucideIcon }> = {
  // appointments
  scheduled: { label: 'Scheduled', tone: 'info', icon: CalendarClock },
  confirmed: { label: 'Confirmed', tone: 'info', icon: CalendarClock },
  completed: { label: 'Completed', tone: 'success', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', tone: 'neutral', icon: Ban },
  no_show: { label: 'No-show', tone: 'danger', icon: UserX },
  rescheduled: { label: 'Rescheduled', tone: 'neutral', icon: RefreshCw },
  // attendance
  present: { label: 'Present', tone: 'success', icon: UserCheck },
  late: { label: 'Late', tone: 'warning', icon: Clock },
  absent: { label: 'Absent', tone: 'danger', icon: UserX },
  excused: { label: 'Excused', tone: 'neutral', icon: CircleSlash },
  // notes / records
  draft: { label: 'Draft', tone: 'warning', icon: PenLine },
  final: { label: 'Final', tone: 'success', icon: CheckCircle2 },
  signed: { label: 'Signed', tone: 'success', icon: Lock },
  // people / plans / goals / leave
  active: { label: 'Active', tone: 'success', icon: CheckCircle2 },
  inactive: { label: 'Inactive', tone: 'neutral', icon: CircleSlash },
  on_hold: { label: 'On hold', tone: 'warning', icon: PauseCircle },
  waitlist: { label: 'Waitlist', tone: 'info', icon: CircleDashed },
  discharged: { label: 'Discharged', tone: 'neutral', icon: CircleSlash },
  achieved: { label: 'Achieved', tone: 'success', icon: Target },
  discontinued: { label: 'Discontinued', tone: 'neutral', icon: CircleSlash },
  pending: { label: 'Pending', tone: 'warning', icon: Clock },
  approved: { label: 'Approved', tone: 'success', icon: CheckCircle2 },
  rejected: { label: 'Rejected', tone: 'danger', icon: Ban },
};

export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  const s = STATUS[status] ?? { label: status.replace(/_/g, ' '), tone: 'neutral' as Tone, icon: CircleDashed };
  const Icon = s.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE_CLASS[s.tone],
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {label ?? s.label}
    </span>
  );
}

/** Small coloured pill for arbitrary text (counts, tags). */
export function TonePill({ tone = 'neutral', children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', TONE_CLASS[tone], className)}>
      {children}
    </span>
  );
}
