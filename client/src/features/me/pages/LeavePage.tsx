import { useState } from 'react';
import { Plane } from 'lucide-react';
import { EmptyTableRow, TableSkeleton } from '@/components/common/Skeletons';
import { StatusBadge } from '@/components/common/StatusBadge';
import { toast } from 'sonner';
import { FormField, NativeSelect } from '@/components/common/FormField';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/format';
import { todayIn } from '@/lib/time';
import { useApplyLeave, useMyLeaves, useSetLeaveStatus } from '../api';

export function days(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
}

export function LeavePage() {
  const { profile } = useAuth();
  const { data, isLoading } = useMyLeaves(profile?.id);
  const apply = useApplyLeave();
  const setStatus = useSetLeaveStatus();
  const today = todayIn('Asia/Kolkata');
  const [form, setForm] = useState({ from_date: today, to_date: today, leave_type: 'casual', reason: '' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (form.to_date < form.from_date) return toast.error('The end date must be on or after the start date');
    try {
      await apply.mutateAsync({ profile_id: profile.id, ...form, reason: form.reason || undefined });
      toast.success('Leave requested. Your branch admin will review it.');
      setForm({ ...form, reason: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not request leave');
    }
  };

  const cancel = async (id: string) => {
    try {
      await setStatus.mutateAsync({ id, status: 'cancelled' });
      toast.success('Leave request cancelled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not cancel');
    }
  };

  return (
    <>
      <PageHeader icon={Plane} title="My leave" description="Request leave. Your branch admin approves it." />
      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Request leave</CardTitle>
            <CardDescription>Tell your admin early so sessions can be rescheduled.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="From" id="lv-from">
                  <Input id="lv-from" type="date" min={today} value={form.from_date} onChange={(e) => setForm({ ...form, from_date: e.target.value })} />
                </FormField>
                <FormField label="To" id="lv-to">
                  <Input id="lv-to" type="date" min={form.from_date} value={form.to_date} onChange={(e) => setForm({ ...form, to_date: e.target.value })} />
                </FormField>
              </div>
              <FormField label="Type" id="lv-type">
                <NativeSelect id="lv-type" value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
                  <option value="casual">Casual</option>
                  <option value="sick">Sick</option>
                  <option value="annual">Annual</option>
                  <option value="other">Other</option>
                </NativeSelect>
              </FormField>
              <FormField label="Reason" id="lv-reason">
                <Input id="lv-reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </FormField>
              <Button type="submit" className="w-full" disabled={apply.isPending}>
                Request {days(form.from_date, form.to_date) > 0 ? `${days(form.from_date, form.to_date)} day(s)` : ''}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>My requests</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dates</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeleton cols={5} rows={2} />}
                {data?.length === 0 && <EmptyTableRow cols={5} icon={Plane} title="No leave requests yet" />}
                {data?.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(l.from_date)}{l.to_date !== l.from_date && ` – ${formatDate(l.to_date)}`}
                      <span className="text-muted-foreground"> · {days(l.from_date, l.to_date)}d</span>
                    </TableCell>
                    <TableCell className="capitalize">{l.leave_type}</TableCell>
                    <TableCell className="text-sm">{l.reason ?? '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={l.status} />
                      {l.reviewer && <span className="ml-1 text-xs text-muted-foreground">by {l.reviewer.full_name}</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {l.status === 'pending' && (
                        <Button variant="ghost" size="sm" onClick={() => cancel(l.id)} disabled={setStatus.isPending}>Cancel</Button>
                      )}
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
