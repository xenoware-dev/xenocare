import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
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

/** A headline number. Optionally links to the list behind it. */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'primary',
  to,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: Tone;
  to?: string;
}) {
  const body = (
    <Card className={cn('h-full gap-0 py-0 transition-shadow', to && 'hover:shadow-md')}>
      <CardContent className="flex items-start justify-between gap-3 p-4 sm:gap-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums sm:mt-1.5 sm:text-3xl">{value}</p>
          {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', ICON_TONE[tone])}>
          <Icon className="size-5" aria-hidden />
        </span>
      </CardContent>
    </Card>
  );
  return to ? (
    <Link to={to} className="block rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}
