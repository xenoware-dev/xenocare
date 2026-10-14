import { FileBarChart, MessageCircle, Plus } from 'lucide-react';
import { EmptyTableRow, TableSkeleton } from '@/components/common/Skeletons';
import { StatusBadge, TonePill } from '@/components/common/StatusBadge';
import { Link } from 'react-router';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranch';
import { usePermission } from '@/hooks/usePermission';
import { formatDate } from '@/lib/format';
import { THERAPY_LABELS } from '@/types/app';
import { useReports } from '../api';

export function ReportsPage() {
  const { profile } = useAuth();
  const { branchId, isAll } = useBranch();
  const canWrite = usePermission('reports.write');
  const { data, isLoading, error } = useReports({ branchId: isAll ? null : branchId });
  const isTherapist = profile?.role === 'therapist';

  return (
    <>
      <PageHeader
        title="Progress reports"
        icon={FileBarChart}
        description="Periodic reports for parents, built from attendance and goal progress"
        actions={
          canWrite && (
            <Button asChild>
              <Link to="/reports/new">
                <Plus /> New report
              </Link>
            </Button>
          )
        }
      />
      <Card>
        <CardContent>
          {error && <p className="mb-4 text-sm text-destructive">{error.message}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Therapy</TableHead>
                {!isTherapist && <TableHead>Therapist</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableSkeleton cols={6} />
              )}
              {data?.length === 0 && (
                <EmptyTableRow cols={6} icon={FileBarChart} title="No progress reports yet" description="Reports are auto-filled from attendance and goal progress."
                  action={canWrite ? <Button size="sm" asChild><Link to="/reports/new"><Plus /> New report</Link></Button> : undefined} />
              )}
              {data?.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(r.period_start)} – {formatDate(r.period_end)}</TableCell>
                  <TableCell>
                    <Link to={`/students/${r.students?.id}`} className="font-medium hover:underline">
                      {r.students?.first_name} {r.students?.last_name}
                    </Link>
                  </TableCell>
                  <TableCell>{THERAPY_LABELS[r.therapy_type]}</TableCell>
                  {!isTherapist && <TableCell>{r.therapist?.full_name}</TableCell>}
                  <TableCell className="space-x-1">
                    <StatusBadge status={r.status} />
                    {r.shared_via_whatsapp_at && (
                      <TonePill tone="success"><MessageCircle className="mr-1 size-3" /> Sent</TonePill>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/reports/${r.id}`}>{r.status === 'final' ? 'View' : 'Edit'}</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
