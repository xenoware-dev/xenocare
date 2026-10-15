import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import type { Tone } from './StatusBadge';

const ICON_TONE: Record<Tone, string> = {
  primary: 'bg-accent text-primary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
  danger: 'bg-danger-soft text-destructive',
  neutral: 'bg-muted text-muted-foreground',
};

const BAR_TONE: Record<Tone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-info',
  danger: 'bg-destructive',
  neutral: 'bg-muted-foreground/40',
};

/** A headline number. Optionally links to the list behind it and shows a 0–1 progress bar. */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'primary',
  to,
  progress,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: Tone;
  to?: string;
  progress?: number;
}) {
  const body = (
    <div
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-soft transition-all sm:p-5',
        to && 'hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lift',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', ICON_TONE[tone])}>
          <Icon className="size-[18px]" aria-hidden />
        </span>
        {to && <ArrowUpRight className="size-4 text-muted-foreground/50 transition-colors group-hover:text-primary" aria-hidden />}
      </div>
      <p className="mt-3 font-display text-[1.75rem] leading-none font-extrabold tracking-tight tabular-nums sm:text-[2rem]">{value}</p>
      <p className="mt-1.5 text-sm font-medium text-muted-foreground">{label}</p>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
          <div className={cn('h-full rounded-full transition-[width] duration-700', BAR_TONE[tone])} style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }} />
        </div>
      )}
      {hint && <p className="mt-2 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
  return to ? (
    <Link to={to} className="block rounded-2xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}
