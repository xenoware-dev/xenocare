import { Plus, Search, UserRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOpenFromQuery } from '@/hooks/useOpenFromQuery';
import { EmptyTableRow, TableSkeleton } from '@/components/common/Skeletons';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBranch } from '@/hooks/useBranch';
import { usePermission } from '@/hooks/usePermission';
import { formatDate } from '@/lib/format';
import { THERAPY_LABELS } from '@/types/app';
import { useStudents } from '../api';
import { NewPatientDialog } from '../components/NewPatientDialog';

export function StudentsPage() {
  const { branchId, isAll } = useBranch();
  const canManage = usePermission('students.manage');
  const { profile } = useAuth();
  const isTherapist = profile?.role === 'therapist';
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  useOpenFromQuery(useCallback(() => setAdding(true), []), canManage);
  const { data, isLoading, error } = useStudents({ branchId: isAll ? null : branchId, search });

  return (
    <>
      <PageHeader
        title={isTherapist ? 'My patients' : 'Patients'}
        icon={UserRound}
        description={isTherapist ? 'Patients assigned to you' : canManage ? 'Patients registered at your branch' : 'Patients across branches (registered by branch admins)'}
        actions={
          canManage && (
            <Button onClick={() => setAdding(true)}>
              <Plus /> New patient
            </Button>
          )
        }
      />
      <Card>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" aria-hidden />
            <Input
              placeholder="Search name or code"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search patients"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error.message}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Date of birth</TableHead>
                <TableHead>Therapists</TableHead>
                <TableHead>Parent</TableHead>
                {isAll && <TableHead>Branch</TableHead>}
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableSkeleton cols={7} />}
              {data?.length === 0 && (
                <EmptyTableRow
                  cols={7}
                  icon={UserRound}
                  title={search ? 'No patients match your search' : 'No patients yet'}
                  description={!search && canManage ? 'Register the first patient for this branch.' : undefined}
                  action={!search && canManage ? <Button size="sm" onClick={() => setAdding(true)}><Plus /> New patient</Button> : undefined}
                />
              )}
              {data?.map((s) => {
                const care = s.student_therapists.filter((t) => !t.end_date);
                const parent = s.student_parents[0];
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.student_code}</TableCell>
                    <TableCell>
                      <Link to={`/students/${s.id}`} className="font-medium hover:underline">
                        {s.first_name} {s.last_name}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDate(s.date_of_birth)}</TableCell>
                    <TableCell className="text-sm">
                      {care.length
                        ? care.map((t) => `${t.profiles?.full_name ?? '?'} (${THERAPY_LABELS[t.therapy_type]})`).join(', ')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {parent?.parents ? (
                        <>
                          <div>{parent.parents.full_name} <span className="text-muted-foreground">({parent.relationship})</span></div>
                          {parent.parents.whatsapp_number && (
                            <div className="text-xs text-muted-foreground">{parent.parents.whatsapp_number}</div>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    {isAll && <TableCell>{s.branches?.name}</TableCell>}
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <NewPatientDialog open={adding} onOpenChange={setAdding} />
    </>
  );
}
