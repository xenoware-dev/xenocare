import { toast } from 'sonner';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLeaveRequests, useSetLeaveStatus, type LeaveStatus } from '@/features/me/api';
import { days } from '@/features/me/pages/LeavePage';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/format';

/** Branch admin / owner: approve or reject staff leave (RLS limits to shared branches). */
export function LeaveRequestsCard() {
  const { profile } = useAuth();
  const { data, isLoading } = useLeaveRequests(true);
  const setStatus = useSetLeaveStatus();
  const rows = (data ?? []).filter((l) => l.profile_id !== profile?.id);
  const pending = rows.filter((l) => l.status === 'pending');

  const review = async (id: string, status: LeaveStatus) => {
    try {
      await setStatus.mutateAsync({ id, status });
      toast.success(`Leave ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update leave');
    }
  };

  if (isLoading || rows.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Leave requests {pending.length > 0 && <Badge className="ml-2">{pending.length} pending</Badge>}</CardTitle>
        <CardDescription>Reschedule affected appointments after approving.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {rows.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
              <div>
                <span className="font-medium">{l.staff?.full_name}</span>
                <span className="text-muted-foreground">
                  {' · '}{formatDate(l.from_date)}{l.to_date !== l.from_date && ` – ${formatDate(l.to_date)}`} ({days(l.from_date, l.to_date)}d, {l.leave_type})
                </span>
                {l.reason && <p className="text-xs text-muted-foreground">{l.reason}</p>}
              </div>
              {l.status === 'pending' ? (
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => review(l.id, 'approved')} disabled={setStatus.isPending}>Approve</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => review(l.id, 'rejected')} disabled={setStatus.isPending}>
                    Reject
                  </Button>
                </div>
              ) : (
                <StatusBadge status={l.status} />
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
