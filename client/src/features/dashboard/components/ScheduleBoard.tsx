import { CalendarX2 } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { THERAPY_STYLE, TherapyChip } from '@/components/common/TherapyChip';
import { UserAvatar } from '@/components/common/UserAvatar';
import type { AgendaItem } from '@/features/sessions/api';
import { timeIn } from '@/lib/time';
import { cn } from '@/lib/utils';

/** Today's appointments, one column per therapist. */
export function ScheduleBoard({ items, timeZone }: { items: AgendaItem[]; timeZone: string }) {
  const columns = new Map<string, { name: string; items: AgendaItem[] }>();
  for (const a of items) {
    const col = columns.get(a.therapist_id) ?? { name: a.therapist?.full_name ?? 'Therapist', items: [] };
    col.items.push(a);
    columns.set(a.therapist_id, col);
  }
  if (!columns.size) {
    return <EmptyState icon={CalendarX2} title="Nothing booked today" description="Appointments booked for today appear here, grouped by therapist." />;
  }
  const now = Date.now();

  return (
    <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
      {[...columns.values()].map((col) => {
        const done = col.items.filter((a) => a.status === 'completed').length;
        return (
          <section key={col.name} className="w-[78vw] max-w-[17rem] shrink-0 snap-start rounded-2xl bg-muted/60 p-2.5 ring-1 ring-border/60 ring-inset sm:w-[17rem]">
            <header className="mb-2.5 flex items-center gap-2.5 px-1 pt-0.5">
              <UserAvatar name={col.name} className="size-8" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold">{col.name}</h3>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(done / col.items.length) * 100}%` }} />
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums">{done}/{col.items.length}</span>
                </div>
              </div>
            </header>
            <ol className="space-y-2">
              {col.items.map((a) => {
                const live = Date.parse(a.start_at) <= now && Date.parse(a.end_at) > now && a.status !== 'cancelled';
                const status = a.status === 'cancelled' || a.status === 'completed' || a.status === 'no_show' ? a.status : (a.attendance?.status ?? a.status);
                return (
                  <li key={a.id}>
                    <Link
                      to={`/students/${a.student_id}`}
                      className={cn(
                        'relative block overflow-hidden rounded-xl border border-border/70 bg-card p-2.5 pl-3.5 shadow-xs transition-all hover:-translate-y-px hover:border-primary/40 hover:shadow-soft',
                        live && 'border-primary/60 ring-2 ring-primary/15',
                        a.status === 'cancelled' && 'opacity-60',
                      )}
                    >
                      <span className={cn('absolute inset-y-0 left-0 w-1', THERAPY_STYLE[a.therapy_type]?.bar)} aria-hidden />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold tabular-nums">
                          {timeIn(a.start_at, timeZone)}
                          {live && <span className="ml-1.5 text-primary">· now</span>}
                        </span>
                        <StatusBadge status={status} />
                      </div>
                      <p className="mt-1.5 truncate text-sm font-bold">{a.student?.first_name} {a.student?.last_name}</p>
                      <TherapyChip type={a.therapy_type} short className="mt-1" />
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
