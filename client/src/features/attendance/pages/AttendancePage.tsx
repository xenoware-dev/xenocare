import { ClipboardCheck, Clock, UserCheck, UserX } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { ListSkeleton } from '@/components/common/Skeletons';
import { StatCard } from '@/components/common/StatCard';
import { WeekStrip } from '@/components/common/WeekStrip';
import { Card, CardContent } from '@/components/ui/card';
import { useAgenda, type AgendaItem } from '@/features/sessions/api';
import { AgendaList } from '@/features/sessions/components/AgendaList';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranch';
import { usePermission } from '@/hooks/usePermission';
import { todayIn } from '@/lib/time';
import { cn } from '@/lib/utils';

type View = 'waiting' | 'arrived' | 'all';
const VIEWS: { value: View; label: string; match: (a: AgendaItem) => boolean }[] = [
  { value: 'waiting', label: 'To check in', match: (a) => a.status !== 'cancelled' && !a.attendance },
  { value: 'arrived', label: 'Marked', match: (a) => !!a.attendance },
  { value: 'all', label: 'Everyone', match: () => true },
];

/** The front-desk check-in screen. Defaults to the children still expected. */
export function AttendancePage() {
  const { profile } = useAuth();
  const { branchId, branch, isAll } = useBranch();
  const canWriteNotes = usePermission('sessions.write');
  const tz = branch?.timezone ?? 'Asia/Kolkata';
  const today = todayIn(tz);
  const [date, setDate] = useState(today);
  const [view, setView] = useState<View>('waiting');
  const isTherapist = profile?.role === 'therapist';
  const { data, isLoading, error } = useAgenda({ date, timeZone: tz, branchId: isAll ? null : branchId });

  const items = data ?? [];
  const counts = items.reduce(
    (acc, a) => {
      if (a.status !== 'cancelled') acc.total++;
      if (a.attendance) acc[a.attendance.status === 'absent' ? 'absent' : 'present']++;
      return acc;
    },
    { total: 0, present: 0, absent: 0 },
  );
  const waiting = Math.max(0, counts.total - counts.present - counts.absent);
  const shown = items.filter(VIEWS.find((v) => v.value === view)!.match);

  return (
    <>
      <PageHeader
        eyebrow="Clinic"
        title={isTherapist ? 'Check-in' : 'Check-in desk'}
        icon={ClipboardCheck}
        description={isTherapist ? 'Mark your patients in as they arrive' : 'Mark children in as they arrive at the branch'}
      />

      <div className="space-y-5">
        <Card>
          <CardContent>
            <WeekStrip date={date} today={today} onChange={setDate} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <StatCard label="Still expected" value={String(waiting)} icon={Clock} tone={waiting ? 'warning' : 'neutral'} />
          <StatCard label="Arrived" value={String(counts.present)} icon={UserCheck} tone="success" progress={counts.total ? counts.present / counts.total : 0} />
          <StatCard label="Absent" value={String(counts.absent)} icon={UserX} tone={counts.absent ? 'danger' : 'neutral'} />
        </div>

        <Card>
          <CardContent className="space-y-4">
            <div className="flex w-full rounded-xl bg-muted p-1 sm:w-fit" role="tablist" aria-label="Show">
              {VIEWS.map((v) => {
                const n = items.filter(v.match).length;
                return (
                  <button
                    key={v.value}
                    type="button"
                    role="tab"
                    aria-selected={view === v.value}
                    onClick={() => setView(v.value)}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all sm:flex-none',
                      view === v.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
                    )}
                  >
                    {v.label}
                    <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums">{n}</span>
                  </button>
                );
              })}
            </div>
            {error && <p className="text-sm text-destructive">{error.message}</p>}
            {isLoading ? (
              <ListSkeleton rows={4} />
            ) : (
              <AgendaList
                items={shown}
                date={date}
                timeZone={tz}
                showTherapist={!isTherapist}
                canCheckIn
                canWriteNotes={canWriteNotes && isTherapist}
                emptyText={view === 'waiting' && items.length ? 'Everyone is checked in' : 'No sessions on this day'}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
