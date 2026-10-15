import { ClipboardList, Plus } from 'lucide-react';
import { EmptyTableRow, TableSkeleton } from '@/components/common/Skeletons';
import { StatusBadge } from '@/components/common/StatusBadge';
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
import { useAssessments } from '../api';

export function AssessmentsPage() {
  const { profile } = useAuth();
  const { branchId, isAll } = useBranch();
  const canWrite = usePermission('assessments.write');
  const { data, isLoading, error } = useAssessments({ branchId: isAll ? null : branchId });
  const isTherapist = profile?.role === 'therapist';

  return (
    <>
      <PageHeader
        eyebrow="Therapy"
        title="Assessments"
        icon={ClipboardList}
        description="Initial and periodic assessments (Speech, OT, Physio)"
        actions={
          canWrite && (
            <Button asChild>
              <Link to="/assessments/new">
                <Plus /> New assessment
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
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Form</TableHead>
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
                <EmptyTableRow cols={6} icon={ClipboardList} title="No assessments yet" description="Record an initial assessment when a patient joins."
                  action={canWrite ? <Button size="sm" asChild><Link to="/assessments/new"><Plus /> New assessment</Link></Button> : undefined} />
              )}
              {data?.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{formatDate(a.assessment_date)}</TableCell>
                  <TableCell>
                    <Link to={`/students/${a.students?.id}`} className="font-medium hover:underline">
                      {a.students?.first_name} {a.students?.last_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    {a.form_templates?.name} <span className="text-muted-foreground">· {THERAPY_LABELS[a.therapy_type]}</span>
                  </TableCell>
                  {!isTherapist && <TableCell>{a.therapist?.full_name}</TableCell>}
                  <TableCell>
                    <StatusBadge status={a.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/assessments/${a.id}`}>{a.status === 'final' ? 'View' : 'Edit'}</Link>
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
