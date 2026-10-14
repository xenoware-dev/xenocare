import { Plus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ListSkeleton } from '@/components/common/Skeletons';
import { EmptyState } from '@/components/common/EmptyState';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useOpenFromQuery } from '@/hooks/useOpenFromQuery';
import { EmptyTableRow, TableSkeleton } from '@/components/common/Skeletons';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranch';
import { usePermission } from '@/hooks/usePermission';
import { ApiError } from '@/lib/api';
import { THERAPY_LABELS } from '@/types/app';
import { useSetStaffActive, useStaff, type StaffRow } from '../api';
import { AddStaffDialog } from '../components/AddStaffDialog';
import { LeaveRequestsCard } from '../components/LeaveRequestsCard';
import { StaffEditDialog } from '../components/StaffEditDialog';

const ROLE_LABEL = { owner: 'Owner', admin: 'Branch admin', therapist: 'Therapist' } as const;
const ROLE_VARIANT = { owner: 'default', admin: 'secondary', therapist: 'outline' } as const;

export function StaffPage() {
  const { profile } = useAuth();
  const { branchId, isAll } = useBranch();
  const canManage = usePermission('staff.manage');
  const canApproveLeave = usePermission('leaves.approve');
  const [adding, setAdding] = useState(false);
  const [settingsFor, setSettingsFor] = useState<StaffRow | null>(null);
  useOpenFromQuery(useCallback(() => setAdding(true), []), canManage);
  const { data, isLoading, error } = useStaff();
  const setActive = useSetStaffActive();

  const rows = (data ?? []).filter(
    (s) => isAll || s.role === 'owner' || s.staff_branches.some((b) => b.branch_id === branchId),
  );

  // Owner manages admins and therapists; admins manage therapists (Express re-checks branches).
  const canToggle = (s: StaffRow) =>
    canManage &&
    s.id !== profile?.id &&
    (profile?.role === 'owner' ? s.role !== 'owner' : profile?.role === 'admin' && s.role === 'therapist');
  const addLabel = profile?.role === 'owner' ? 'Add branch admin' : 'Add therapist';
  // Profile edits: owner → admins + therapists; admin → therapists of their branches (RLS enforces the same).
  const canEdit = (s: StaffRow) =>
    s.id !== profile?.id && (profile?.role === 'owner' ? s.role !== 'owner' : profile?.role === 'admin' && s.role === 'therapist');

  const toggle = async (s: StaffRow) => {
    try {
      await setActive.mutateAsync({ id: s.id, is_active: !s.is_active });
      toast.success(s.is_active ? `${s.full_name} deactivated` : `${s.full_name} reactivated`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update status');
    }
  };

  return (
    <>
      <PageHeader
        title="Staff"
        icon={Users}
        description={
          profile?.role === 'owner'
            ? 'You add branch admins. Each branch admin adds the therapists of their branch.'
            : 'Therapists of your branches. They sign in with the Google account you register here.'
        }
        actions={
          canManage && (
            <Button onClick={() => setAdding(true)}>
              <Plus /> {addLabel}
            </Button>
          )
        }
      />
      {canApproveLeave && <LeaveRequestsCard />}
      <Card>
        <CardContent>
          {error && <p className="mb-4 text-sm text-destructive">{error.message}</p>}
          {/* Phones: cards */}
          <div className="space-y-2 md:hidden">
            {isLoading && <ListSkeleton rows={3} />}
            {data && rows.length === 0 && <EmptyState icon={Users} title="No staff in this branch yet" />}
            {rows.map((s) => (
              <article key={s.id} className={cn('rounded-xl border bg-card p-3.5', !s.is_active && 'opacity-60')}>
                <div className="flex items-center gap-3">
                  <UserAvatar name={s.full_name || s.email} path={s.avatar_url} className="size-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.full_name || '—'}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                  </div>
                  <StatusBadge status={s.is_active ? 'active' : 'inactive'} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{ROLE_LABEL[s.role]}</span>
                  {' · '}
                  {s.role === 'owner' ? 'All branches' : s.staff_branches.map((b) => b.branches?.name).filter(Boolean).join(', ') || '—'}
                  {s.staff_details?.therapy_types.length ? ` · ${s.staff_details.therapy_types.map((t) => THERAPY_LABELS[t]).join(', ')}` : ''}
                </p>
                {(canEdit(s) || canToggle(s)) && (
                  <div className="mt-3 flex gap-2">
                    {canEdit(s) && (
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setSettingsFor(s)}>Edit</Button>
                    )}
                    {canToggle(s) && (
                      <Button variant="ghost" size="sm" className="flex-1" onClick={() => toggle(s)} disabled={setActive.isPending}>
                        {s.is_active ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Branches</TableHead>
                  <TableHead>Therapy</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableSkeleton cols={6} />}
                {data && rows.length === 0 && (
                  <EmptyTableRow
                    cols={6}
                    icon={Users}
                    title="No staff in this branch yet"
                    action={canManage ? <Button size="sm" onClick={() => setAdding(true)}><Plus /> {addLabel}</Button> : undefined}
                  />
                )}
                {rows.map((s) => (
                  <TableRow key={s.id} className={s.is_active ? undefined : 'opacity-60'}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <UserAvatar name={s.full_name || s.email} path={s.avatar_url} className="size-8" />
                        <div>
                          <div className="font-medium">{s.full_name || '—'}</div>
                          <div className="text-xs text-muted-foreground">{s.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ROLE_VARIANT[s.role]}>{ROLE_LABEL[s.role]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.role === 'owner'
                        ? 'All branches'
                        : s.staff_branches.map((b) => b.branches?.name).filter(Boolean).join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.staff_details?.therapy_types.map((t) => THERAPY_LABELS[t]).join(', ') || '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.is_active ? 'active' : 'inactive'} />
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        {canEdit(s) && (
                          <Button variant="ghost" size="sm" onClick={() => setSettingsFor(s)}>
                            Edit
                          </Button>
                        )}
                        {canToggle(s) && (
                          <Button variant="ghost" size="sm" onClick={() => toggle(s)} disabled={setActive.isPending}>
                            {s.is_active ? 'Deactivate' : 'Reactivate'}
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <AddStaffDialog open={adding} onOpenChange={setAdding} />
      {settingsFor && (
        <StaffEditDialog key={settingsFor.id} staff={settingsFor} open onOpenChange={(o) => !o && setSettingsFor(null)} />
      )}
    </>
  );
}
