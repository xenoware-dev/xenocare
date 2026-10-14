import { CalendarX2 } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import type { AgendaItem } from '@/features/sessions/api';
import { timeIn } from '@/lib/time';
import { cn } from '@/lib/utils';
import { THERAPY_LABELS } from '@/types/app';

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
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
      {[...columns.values()].map((col) => {
        const done = col.items.filter((a) => a.status === 'completed').length;
        return (
          <section key={col.name} className="w-64 shrink-0 rounded-xl border bg-muted/40 p-2.5">
            <header className="mb-2 flex items-center justify-between px-1">
              <h3 className="truncate text-sm font-semibold">{col.name}</h3>
              <span className="text-xs text-muted-foreground tabular-nums">{done}/{col.items.length} done</span>
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
                        'block rounded-lg border bg-card p-2.5 shadow-xs transition-colors hover:border-primary/40',
                        live && 'border-primary/60 ring-2 ring-primary/15',
                        a.status === 'cancelled' && 'opacity-60',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold tabular-nums">
                          {timeIn(a.start_at, timeZone)}
                          {live && <span className="ml-1.5 text-primary">· now</span>}
                        </span>
                        <StatusBadge status={status} />
                      </div>
                      <p className="mt-1 truncate text-sm font-medium">{a.student?.first_name} {a.student?.last_name}</p>
                      <p className="text-xs text-muted-foreground">{THERAPY_LABELS[a.therapy_type]}</p>
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
