import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addDays, weekdayOf } from '@/lib/time';
import { cn } from '@/lib/utils';

const fmt = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-IN', { ...opts, timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

/** Mon–Sun strip around `date`, with week paging, "Today" and a native date picker for far jumps. */
export function WeekStrip({ date, today, onChange }: { date: string; today: string; onChange: (d: string) => void }) {
  const monday = addDays(date, -((weekdayOf(date) + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-display text-lg font-bold">{fmt(date, { month: 'long', year: 'numeric' })}</h2>
        {date !== today && (
          <Button variant="outline" size="sm" onClick={() => onChange(today)}>
            Today
          </Button>
        )}
        <Button variant="outline" size="icon-sm" onClick={() => onChange(addDays(date, -7))} aria-label="Previous week">
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon-sm" onClick={() => onChange(addDays(date, 7))} aria-label="Next week">
          <ChevronRight />
        </Button>
        <label className="relative">
          <span className="sr-only">Pick a date</span>
          <span className="pointer-events-none flex size-8 items-center justify-center rounded-lg border bg-card shadow-xs">
            <CalendarDays className="size-4" aria-hidden />
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="tablist" aria-label="Day">
        {days.map((d) => {
          const selected = d === date;
          const isToday = d === today;
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(d)}
              className={cn(
                'relative flex flex-col items-center rounded-2xl py-2 transition-all sm:py-2.5',
                selected
                  ? 'bg-brand-ink text-white shadow-lift dark:bg-primary dark:text-primary-foreground'
                  : 'bg-card ring-1 ring-border/70 hover:ring-primary/40',
              )}
            >
              <span className={cn('text-[10px] font-bold tracking-wider uppercase sm:text-[11px]', selected ? 'text-white/70 dark:text-primary-foreground/70' : 'text-muted-foreground')}>
                {fmt(d, { weekday: 'short' })}
              </span>
              <span className="font-display text-lg leading-tight font-extrabold tabular-nums sm:text-xl">{fmt(d, { day: 'numeric' })}</span>
              {isToday && <span className={cn('absolute bottom-1 size-1 rounded-full', selected ? 'bg-sunflower' : 'bg-primary')} aria-label="today" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
