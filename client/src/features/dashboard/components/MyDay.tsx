import { ArrowRight, CalendarCheck, ClipboardList, Clock, FilePenLine, PartyPopper, Plane, UserCheck } from 'lucide-react';
import { Link } from 'react-router';
import { DayHero, firstName, greeting } from '@/components/common/DayHero';
import { ProgressRing } from '@/components/common/ProgressRing';
import { ListSkeleton } from '@/components/common/Skeletons';
import { StatCard } from '@/components/common/StatCard';
import { TherapyChip } from '@/components/common/TherapyChip';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAgenda, usePendingNotes, type AgendaItem } from '@/features/sessions/api';
import { AgendaList } from '@/features/sessions/components/AgendaList';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { timeIn, todayIn } from '@/lib/time';
import { cn } from '@/lib/utils';

function startsIn(a: AgendaItem) {
  const mins = Math.round((Date.parse(a.start_at) - Date.now()) / 60_000);
  if (mins <= 0) return 'happening now';
  if (mins < 60) return `starts in ${mins} min`;
  const h = Math.floor(mins / 60);
  return `starts in ${h} h ${mins % 60 ? `${mins % 60} min` : ''}`.trim();
}

function daysAgo(iso: string) {
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
}

/** Therapist home: what's next, today's session flow, and notes still to write. */
export function MyDay() {
  const { profile, branches } = useAuth();
  const canAssess = usePermission('assessments.write');
  const tz = branches[0]?.timezone ?? 'Asia/Kolkata';
  const today = todayIn(tz);
  const agenda = useAgenda({ date: today, timeZone: tz, branchId: null, therapistId: profile?.id });
  const pending = usePendingNotes(profile?.id);

  const sessions = (agenda.data ?? []).filter((a) => a.status !== 'cancelled');
  const checkedIn = sessions.filter((a) => a.attendance && a.attendance.status !== 'absent').length;
  const signed = sessions.filter((a) => a.session?.is_locked).length;
  const absent = sessions.filter((a) => a.attendance?.status === 'absent' || a.status === 'no_show').length;
  const toSign = Math.max(0, sessions.length - absent);
  const now = Date.now();
  const next = sessions.find((a) => Date.parse(a.end_at) > now && !a.attendance && a.status !== 'no_show');
  const backlog = pending.data ?? [];
  const name = firstName(profile?.full_name);
  const allDone = sessions.length > 0 && signed === toSign;

  return (
    <div className="space-y-6">
      <DayHero
        eyebrow={new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz }).format(new Date())}
        title={
          <>
            {greeting()}, <span className="text-primary">{name}</span>
          </>
        }
        description={
          agenda.isLoading
            ? 'Loading your day…'
            : sessions.length === 0
              ? 'No sessions booked for you today.'
              : allDone
                ? 'Every session today is written up and signed. Lovely work.'
                : `${sessions.length} session${sessions.length > 1 ? 's' : ''} today · ${toSign - signed} note${toSign - signed === 1 ? '' : 's'} left to sign.`
        }
        aside={
          sessions.length > 0 && (
            <ProgressRing value={toSign ? signed / toSign : 0} size={112} stroke={10} label={`${signed} of ${toSign} notes signed`}>
              {allDone ? (
                <PartyPopper className="size-7 text-primary" aria-hidden />
              ) : (
                <>
                  <span className="font-display text-2xl font-extrabold tabular-nums">
                    {signed}
                    <span className="text-base text-muted-foreground">/{toSign}</span>
                  </span>
                  <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">signed</span>
                </>
              )}
            </ProgressRing>
          )
        }
      >
        {next && (
          <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-brand-ink p-4 text-white shadow-lift dark:bg-card dark:ring-1 dark:ring-primary/30">
            <span className="flex items-center gap-1.5 rounded-full bg-sunflower px-2.5 py-1 text-[11px] font-bold tracking-wider text-sunflower-foreground uppercase">
              <Clock className="size-3.5" aria-hidden /> Up next
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <UserAvatar name={`${next.student?.first_name} ${next.student?.last_name ?? ''}`} className="size-11 ring-2 ring-white/20" />
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-bold">
                  {next.student?.first_name} {next.student?.last_name}
                </p>
                <p className="flex flex-wrap items-center gap-2 text-sm text-white/70">
                  {timeIn(next.start_at, tz)} – {timeIn(next.end_at, tz)} · {startsIn(next)}
                  <TherapyChip type={next.therapy_type} short />
                </p>
              </div>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button asChild variant="sunflower" className="flex-1 sm:flex-none">
                <Link to={`/sessions/appointment/${next.id}`}>
                  <FilePenLine /> Start note
                </Link>
              </Button>
              <Button asChild variant="ghost" className="flex-1 text-white hover:bg-white/10 hover:text-white sm:flex-none">
                <Link to={`/students/${next.student_id}`}>
                  Open profile <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </DayHero>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Sessions today" value={String(sessions.length)} icon={CalendarCheck} to="/appointments" />
        <StatCard
          label="Checked in"
          value={`${checkedIn}/${sessions.length}`}
          icon={UserCheck}
          tone="success"
          progress={sessions.length ? checkedIn / sessions.length : 0}
        />
        <StatCard label="Notes signed" value={`${signed}/${toSign}`} icon={ClipboardList} tone="info" progress={toSign ? signed / toSign : 0} />
        <StatCard
          label="Notes backlog"
          value={String(backlog.length)}
          icon={FilePenLine}
          tone={backlog.length ? 'warning' : 'success'}
          hint={backlog.length ? 'Last 30 days, unsigned' : 'All caught up'}
          to="/sessions"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Today's sessions</CardTitle>
            <CardDescription>Mark the child in when they arrive, write the note, then sign it.</CardDescription>
          </CardHeader>
          <CardContent>
            {agenda.isLoading ? (
              <ListSkeleton rows={3} />
            ) : (
              <AgendaList items={agenda.data ?? []} date={today} timeZone={tz} canCheckIn canWriteNotes emptyText="No sessions booked for you today." />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle>Notes to finish</CardTitle>
                <CardDescription>Oldest first matters: parents wait on these.</CardDescription>
              </div>
              {backlog.length > 0 && (
                <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-bold text-warning tabular-nums">{backlog.length}</span>
              )}
            </CardHeader>
            <CardContent>
              {pending.isLoading ? (
                <ListSkeleton rows={2} />
              ) : backlog.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl bg-success-soft p-3 text-sm text-success">
                  <PartyPopper className="size-5 shrink-0" aria-hidden />
                  <span className="font-semibold">No unsigned notes. You're all caught up.</span>
                </div>
              ) : (
                <ul className="-mx-2 space-y-0.5">
                  {[...backlog]
                    .sort((x, y) => Date.parse(x.start_at) - Date.parse(y.start_at))
                    .slice(0, 6)
                    .map((a) => {
                      const old = Date.now() - Date.parse(a.start_at) > 2 * 86_400_000;
                      return (
                        <li key={a.id}>
                          <Link
                            to={`/sessions/appointment/${a.id}`}
                            className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted"
                          >
                            <UserAvatar name={`${a.student?.first_name} ${a.student?.last_name ?? ''}`} className="size-9" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">
                                {a.student?.first_name} {a.student?.last_name}
                              </span>
                              <span className={cn('block text-xs', old ? 'font-semibold text-destructive' : 'text-muted-foreground')}>
                                {daysAgo(a.start_at)} · {a.session ? 'draft saved' : 'not started'}
                              </span>
                            </span>
                            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
                          </Link>
                        </li>
                      );
                    })}
                </ul>
              )}
              {backlog.length > 6 && (
                <Button asChild variant="ghost" size="sm" className="mt-2 w-full">
                  <Link to="/sessions">See all {backlog.length}</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="gap-3">
            <CardHeader>
              <CardTitle>Shortcuts</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {canAssess && <Shortcut to="/assessments/new" icon={ClipboardList} label="New assessment" />}
              <Shortcut to="/appointments" icon={CalendarCheck} label="My schedule" />
              <Shortcut to="/students" icon={UserCheck} label="My patients" />
              <Shortcut to="/leave" icon={Plane} label="Request leave" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Shortcut({ to, icon: Icon, label }: { to: string; icon: typeof Plane; label: string }) {
  return (
    <Link to={to} className="flex flex-col gap-2 rounded-xl border bg-muted/40 p-3 text-sm font-semibold transition-colors hover:border-primary/30 hover:bg-accent">
      <Icon className="size-4 text-primary" aria-hidden />
      {label}
    </Link>
  );
}
