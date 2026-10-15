import { CheckCircle2, NotebookPen } from 'lucide-react';
import { EmptyTableRow, TableSkeleton } from '@/components/common/Skeletons';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useState } from 'react';
import { Link } from 'react-router';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranch';
import { formatDate } from '@/lib/format';
import { timeIn } from '@/lib/time';
import { THERAPY_LABELS } from '@/types/app';
import { usePendingNotes, useSessionList } from '../api';

type Tab = 'todo' | 'draft' | 'signed';

export function SessionsPage() {
  const { profile } = useAuth();
  const { branchId, isAll, branch } = useBranch();
  const isTherapist = profile?.role === 'therapist';
  const [tab, setTab] = useState<Tab>(isTherapist ? 'todo' : 'signed');
  const pending = usePendingNotes(isTherapist ? profile?.id : undefined);
  const list = useSessionList({ branchId: isAll ? null : branchId, status: tab === 'todo' ? 'all' : tab });
  const tz = branch?.timezone ?? 'Asia/Kolkata';

  return (
    <>
      <PageHeader
        eyebrow="Therapy"
        title="Session notes"
        icon={NotebookPen}
        description={isTherapist ? 'Write a SOAP note after every session, then sign it.' : 'Clinical notes written by therapists'}
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-4">
        <TabsList>
          {isTherapist && (
            <TabsTrigger value="todo">
              To write {pending.data?.length ? <Badge className="ml-1.5">{pending.data.length}</Badge> : null}
            </TabsTrigger>
          )}
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="signed">Signed</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent>
          {tab === 'todo' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Therapy</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.isLoading && <TableSkeleton cols={4} />}
                {pending.data?.length === 0 && <EmptyTableRow cols={4} icon={CheckCircle2} title="All caught up" description="No notes to write." />}
                {pending.data?.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(a.start_at)} · {timeIn(a.start_at, tz)}
                    </TableCell>
                    <TableCell className="font-medium">{a.student?.first_name} {a.student?.last_name}</TableCell>
                    <TableCell>{THERAPY_LABELS[a.therapy_type]}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant={a.session ? 'outline' : 'default'}>
                        <Link to={`/sessions/appointment/${a.id}`}>{a.session ? 'Continue' : 'Write note'}</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Therapy</TableHead>
                  {!isTherapist && <TableHead>Therapist</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.isLoading && <TableSkeleton cols={6} />}
                {list.error && <EmptyRow cols={6} text={list.error.message} />}
                {list.data?.length === 0 && <EmptyTableRow cols={6} icon={NotebookPen} title={tab === 'draft' ? 'No drafts' : 'No signed notes yet'} />}
                {list.data?.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{formatDate(s.session_date)}</TableCell>
                    <TableCell>
                      <Link to={`/students/${s.students?.id}`} className="font-medium hover:underline">
                        {s.students?.first_name} {s.students?.last_name}
                      </Link>
                    </TableCell>
                    <TableCell>{THERAPY_LABELS[s.therapy_type]}</TableCell>
                    {!isTherapist && <TableCell>{s.therapist?.full_name}</TableCell>}
                    <TableCell>
                      <StatusBadge status={s.is_locked ? 'signed' : 'draft'} />
                    </TableCell>
                    <TableCell className="text-right">
                      {s.appointment_id && (
                        <Button asChild size="sm" variant="ghost">
                          <Link to={`/sessions/appointment/${s.appointment_id}`}>{s.is_locked ? 'View' : 'Edit'}</Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="text-center text-muted-foreground">{text}</TableCell>
    </TableRow>
  );
}
