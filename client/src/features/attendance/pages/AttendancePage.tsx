import { ChevronLeft, ChevronRight, ClipboardCheck } from 'lucide-react';
import { ListSkeleton } from '@/components/common/Skeletons';
import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAgenda } from '@/features/sessions/api';
import { AgendaList } from '@/features/sessions/components/AgendaList';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranch';
import { usePermission } from '@/hooks/usePermission';
import { addDays, todayIn } from '@/lib/time';

export function AttendancePage() {
  const { profile } = useAuth();
  const { branchId, branch, isAll } = useBranch();
  const canWriteNotes = usePermission('sessions.write');
  const tz = branch?.timezone ?? 'Asia/Kolkata';
  const [date, setDate] = useState(() => todayIn(tz));
  const isTherapist = profile?.role === 'therapist';
  const { data, isLoading, error } = useAgenda({ date, timeZone: tz, branchId: isAll ? null : branchId });

  const counts = (data ?? []).reduce(
    (acc, a) => {
      if (a.status !== 'cancelled') acc.total++;
      if (a.attendance) acc[a.attendance.status === 'absent' ? 'absent' : 'present']++;
      return acc;
    },
    { total: 0, present: 0, absent: 0 },
  );

  return (
    <>
      <PageHeader
        title="Attendance"
        icon={ClipboardCheck}
        description={isTherapist ? 'Check in your patients for each session' : 'Patient check-in for the branch'}
      />
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
              <ChevronLeft />
            </Button>
            <Button variant="outline" onClick={() => setDate(todayIn(tz))}>Today</Button>
            <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, 1))} aria-label="Next day">
              <ChevronRight />
            </Button>
            <Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-auto" aria-label="Date" />
            <p className="ml-auto text-sm text-muted-foreground tabular-nums">
              {counts.present} present · {counts.absent} absent · {counts.total - counts.present - counts.absent} not marked
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error.message}</p>}
          {isLoading ? (
            <ListSkeleton rows={4} />
          ) : (
            <AgendaList
              items={data ?? []}
              date={date}
              timeZone={tz}
              showTherapist={!isTherapist}
              canCheckIn
              canWriteNotes={canWriteNotes && isTherapist}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
