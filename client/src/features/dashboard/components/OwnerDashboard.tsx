import { AlertTriangle, ArrowRight, Building2, CalendarCheck, Plus, UserCog, Users } from 'lucide-react';
import { Link } from 'react-router';
import { DayHero, firstName, greeting } from '@/components/common/DayHero';
import { StatSkeleton } from '@/components/common/Skeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/common/StatCard';
import { TonePill } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranch';
import { todayIn } from '@/lib/time';
import { useBranchComparison } from '../api';

/** Owner, "All branches": how each branch is doing this month. */
export function OwnerDashboard() {
  const { profile } = useAuth();
  const { setBranchId } = useBranch();
  const today = todayIn('Asia/Kolkata');
  const { data, isLoading, error } = useBranchComparison(today);
  const month = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date());

  const rows = data ?? [];
  const totals = rows.reduce(
    (t, b) => ({
      patients: t.patients + b.activePatients,
      therapists: t.therapists + b.therapists,
      admins: t.admins + b.admins.length,
      sessions: t.sessions + b.sessionsDone,
    }),
    { patients: 0, therapists: 0, admins: 0, sessions: 0 },
  );
  const noAdmin = rows.filter((b) => b.admins.length === 0);
  const highNoShow = rows.filter((b) => b.sessionsDone + b.noShows >= 5 && b.noShows / (b.sessionsDone + b.noShows) > 0.15);

  return (
    <>
      <DayHero
        eyebrow={`All branches · ${month}`}
        title={
          <>
            {greeting()}, <span className="text-primary">{firstName(profile?.full_name)}</span>
          </>
        }
        description="How every centre is doing this month. Pick a branch in the switcher to see its day in detail."
        actions={
          <>
            <Button asChild size="lg">
              <Link to="/staff?new=1"><UserCog /> Add branch admin</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/branches?new=1"><Plus /> New branch</Link>
            </Button>
          </>
        }
        className="mb-6"
      />
      {error && <p className="mb-4 text-sm text-destructive">{error.message}</p>}

      <div className="space-y-6">
        {isLoading ? (
          <StatSkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard label="Branches" value={String(rows.length)} icon={Building2} to="/branches" />
            <StatCard label="Active patients" value={String(totals.patients)} icon={Users} tone="info" />
            <StatCard label="Staff" value={String(totals.admins + totals.therapists)} icon={UserCog} tone="neutral" hint={`${totals.admins} admins · ${totals.therapists} therapists`} to="/staff" />
            <StatCard label="Sessions this month" value={String(totals.sessions)} icon={CalendarCheck} tone="success" hint="Completed" />
          </div>
        )}

        {(noAdmin.length > 0 || highNoShow.length > 0) && (
          <Card className="border-warning/40 bg-warning-soft/40">
            <CardContent className="space-y-2 text-sm">
              <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4 text-warning" aria-hidden /> Needs your attention</p>
              {noAdmin.length > 0 && (
                <p>
                  No branch admin yet: <span className="font-medium">{noAdmin.map((b) => b.name).join(', ')}</span>.{' '}
                  <Link to="/staff?new=1" className="text-primary underline-offset-2 hover:underline">Add one</Link>
                </p>
              )}
              {highNoShow.length > 0 && (
                <p>High no-show rate this month: <span className="font-medium">{highNoShow.map((b) => b.name).join(', ')}</span>.</p>
              )}
            </CardContent>
          </Card>
        )}

        <section>
          <div className="mb-3 flex items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold">Branches this month</h2>
              <p className="text-sm text-muted-foreground">Open a branch to see its live schedule and alerts.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
            {rows.map((b) => {
              const total = b.sessionsDone + b.noShows;
              return (
                <article key={b.id} className="group flex flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
                  <header className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
                        <Building2 className="size-5" aria-hidden />
                      </span>
                      <div>
                        <h3 className="font-display text-lg leading-tight font-bold">{b.name}</h3>
                        <p className="font-mono text-xs text-muted-foreground">{b.code}</p>
                      </div>
                    </div>
                    {b.admins.length === 0 && <TonePill tone="warning">No admin</TonePill>}
                  </header>

                  <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
                    {[
                      ['Patients', b.activePatients],
                      ['Therapists', b.therapists],
                      ['Sessions', b.sessionsDone],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-xl bg-muted/60 py-2.5">
                        <dt className="text-[11px] font-semibold text-muted-foreground">{k}</dt>
                        <dd className="font-display text-xl font-extrabold tabular-nums">{v}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-muted-foreground">Attendance</span>
                      <span className="font-bold tabular-nums">{b.attendancePct === null ? '—' : `${b.attendancePct}%`}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={b.attendancePct !== null && b.attendancePct < 80 ? 'h-full rounded-full bg-warning' : 'h-full rounded-full bg-primary'}
                        style={{ width: `${b.attendancePct ?? 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {b.noShows ? `${b.noShows} no-show${b.noShows > 1 ? 's' : ''} of ${total} sessions` : 'No no-shows this month'}
                    </p>
                  </div>

                  <footer className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
                    <p className="min-w-0 truncate text-xs text-muted-foreground">
                      {b.admins.length ? <>Admin: <span className="font-semibold text-foreground">{b.admins.join(', ')}</span></> : 'Assign a branch admin'}
                    </p>
                    <Button size="sm" variant="brand" onClick={() => setBranchId(b.id)}>
                      Open <ArrowRight />
                    </Button>
                  </footer>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
