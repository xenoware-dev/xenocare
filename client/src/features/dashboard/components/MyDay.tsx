import { CalendarCheck, ClipboardCheck, FilePenLine, UserCheck } from 'lucide-react';
import { ListSkeleton } from '@/components/common/Skeletons';
import { Link } from 'react-router';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAgenda, usePendingNotes } from '@/features/sessions/api';
import { AgendaList } from '@/features/sessions/components/AgendaList';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/format';
import { timeIn, todayIn } from '@/lib/time';
import { THERAPY_LABELS } from '@/types/app';

/** Therapist home: today's sessions with check-in, and notes still to write. */
export function MyDay() {
  const { profile, branches } = useAuth();
  const tz = branches[0]?.timezone ?? 'Asia/Kolkata';
  const today = todayIn(tz);
  const agenda = useAgenda({ date: today, timeZone: tz, branchId: null, therapistId: profile?.id });
  const pending = usePendingNotes(profile?.id);

  const sessions = (agenda.data ?? []).filter((a) => a.status !== 'cancelled');
  const checkedIn = sessions.filter((a) => a.attendance && a.attendance.status !== 'absent').length;
  const signed = sessions.filter((a) => a.session?.is_locked).length;
  const now = Date.now();
  const next = sessions.find((a) => Date.parse(a.end_at) > now && !a.attendance);
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <PageHeader
        title={`${greeting}, ${profile?.full_name?.split(' ')[0] || 'there'}`}
        description={new Intl.DateTimeFormat('en-IN', { dateStyle: 'full', timeZone: tz }).format(new Date())}
      />
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard label="Sessions today" value={String(sessions.length)} icon={CalendarCheck} />
          <StatCard label="Checked in" value={`${checkedIn} / ${sessions.length}`} icon={UserCheck} />
          <StatCard label="Notes signed today" value={String(signed)} icon={ClipboardCheck} />
          <StatCard
            label="Notes to write"
            value={String(pending.data?.length ?? 0)}
            icon={FilePenLine}
            hint={pending.data?.length ? 'Includes earlier sessions' : 'All caught up'}
          />
        </div>

        {next && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium tracking-wide text-primary uppercase">Next up</p>
                <p className="mt-1 text-lg font-semibold">
                  {next.student?.first_name} {next.student?.last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {timeIn(next.start_at, tz)} – {timeIn(next.end_at, tz)} · {THERAPY_LABELS[next.therapy_type]}
                </p>
              </div>
              <Button asChild variant="outline">
                <Link to={`/students/${next.student_id}`}>Open patient</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Today</CardTitle>
            <CardDescription>Mark attendance when the child arrives, then write the note after the session.</CardDescription>
          </CardHeader>
          <CardContent>
            {agenda.isLoading ? (
              <ListSkeleton rows={3} />
            ) : (
              <AgendaList
                items={agenda.data ?? []}
                date={today}
                timeZone={tz}
                canCheckIn
                canWriteNotes
                emptyText="No sessions booked for you today."
              />
            )}
          </CardContent>
        </Card>

        {!!pending.data?.length && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Notes to write</CardTitle>
                <CardDescription>Sessions from the last 30 days without a signed note</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/sessions">See all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {pending.data.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-4 py-2.5">
                    <div className="text-sm">
                      <span className="font-medium">{a.student?.first_name} {a.student?.last_name}</span>
                      <span className="text-muted-foreground"> · {formatDate(a.start_at)} {timeIn(a.start_at, tz)}</span>
                    </div>
                    <Button asChild size="sm" variant={a.session ? 'outline' : 'default'}>
                      <Link to={`/sessions/appointment/${a.id}`}>{a.session ? 'Continue' : 'Write note'}</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
