import { Building2, Pencil, Plus } from 'lucide-react';
import { useOpenFromQuery } from '@/hooks/useOpenFromQuery';
import { EmptyTableRow, TableSkeleton } from '@/components/common/Skeletons';
import { StatusBadge, TonePill } from '@/components/common/StatusBadge';
import { useCallback, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBranches, type BranchRow } from '../api';
import { BranchDialog } from '../components/BranchDialog';

export function BranchesPage() {
  const { data, isLoading, error } = useBranches();
  const [editing, setEditing] = useState<BranchRow | null>(null);
  const [open, setOpen] = useState(false);
  useOpenFromQuery(
    useCallback(() => {
      setEditing(null);
      setOpen(true);
    }, []),
  );

  const openDialog = (branch: BranchRow | null) => {
    setEditing(branch);
    setOpen(true);
  };
  const count = (b: BranchRow, role: string) =>
    b.staff_branches.filter((s) => s.profiles?.role === role && s.profiles.is_active).length;

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Branches"
        icon={Building2}
        description="Create branches, then add a branch admin for each one on the Staff page."
        actions={
          <Button onClick={() => openDialog(null)}>
            <Plus /> New branch
          </Button>
        }
      />
      <Card>
        <CardContent>
          {error && <p className="mb-4 text-sm text-destructive">{error.message}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>City</TableHead>
                <TableHead className="text-right">Admins</TableHead>
                <TableHead className="text-right">Therapists</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"><span className="sr-only">Edit</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableSkeleton cols={7} />}
              {data?.length === 0 && (
                <EmptyTableRow cols={7} icon={Building2} title="No branches yet" action={<Button size="sm" onClick={() => openDialog(null)}><Plus /> New branch</Button>} />
              )}
              {data?.map((b) => (
                <TableRow key={b.id} className={b.is_active ? undefined : 'opacity-60'}>
                  <TableCell>
                    <div className="font-medium">{b.name}</div>
                    {b.address && <div className="text-xs text-muted-foreground">{b.address}</div>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{b.code}</TableCell>
                  <TableCell>{b.city ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    {count(b, 'admin') || <TonePill tone="warning">None yet</TonePill>}
                  </TableCell>
                  <TableCell className="text-right">{count(b, 'therapist')}</TableCell>
                  <TableCell>
                    <StatusBadge status={b.is_active ? 'active' : 'inactive'} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openDialog(b)} aria-label={`Edit ${b.name}`}>
                      <Pencil />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <BranchDialog branch={editing} open={open} onOpenChange={setOpen} />
    </>
  );
}
