import { AlertTriangle, Building2, CalendarCheck, Plus, UserCog, Users } from 'lucide-react';
import { Link } from 'react-router';
import { PageHeader } from '@/components/common/PageHeader';
import { StatSkeleton, TableSkeleton } from '@/components/common/Skeletons';
import { StatCard } from '@/components/common/StatCard';
import { TonePill } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranch';
import { todayIn } from '@/lib/time';
import { useBranchComparison } from '../api';
import { greeting } from './BranchDashboard';

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
      <PageHeader
        title={`${greeting()}, ${profile?.full_name?.split(' ')[0] || 'there'}`}
        description={`All branches · ${month}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/branches?new=1"><Plus /> New branch</Link>
            </Button>
            <Button asChild>
              <Link to="/staff?new=1"><UserCog /> Add branch admin</Link>
            </Button>
          </>
        }
      />
      {error && <p className="mb-4 text-sm text-destructive">{error.message}</p>}

      <div className="space-y-6">
        {isLoading ? (
          <StatSkeleton />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

        <Card>
          <CardHeader>
            <CardTitle>Branches this month</CardTitle>
            <CardDescription>Open a branch to see its live schedule and alerts.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead className="text-right">Therapists</TableHead>
                  <TableHead className="text-right">Patients</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Attendance</TableHead>
                  <TableHead className="text-right">No-shows</TableHead>
                  <TableHead><span className="sr-only">Open</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeleton cols={8} />}
                {rows.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <span className="font-medium">{b.name}</span> <span className="font-mono text-xs text-muted-foreground">{b.code}</span>
                    </TableCell>
                    <TableCell className="text-sm">{b.admins.length ? b.admins.join(', ') : <TonePill tone="warning">None</TonePill>}</TableCell>
                    <TableCell className="text-right tabular-nums">{b.therapists}</TableCell>
                    <TableCell className="text-right tabular-nums">{b.activePatients}</TableCell>
                    <TableCell className="text-right tabular-nums">{b.sessionsDone}</TableCell>
                    <TableCell className="text-right tabular-nums">{b.attendancePct === null ? '—' : `${b.attendancePct}%`}</TableCell>
                    <TableCell className="text-right tabular-nums">{b.noShows || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setBranchId(b.id)}>Open</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
