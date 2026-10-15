import { LayoutGrid, List, MessageCircle, Phone, Plus, Search, UserRound, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyTableRow, TableSkeleton } from '@/components/common/Skeletons';
import { StatusBadge } from '@/components/common/StatusBadge';
import { TherapyChip } from '@/components/common/TherapyChip';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranch';
import { useOpenFromQuery } from '@/hooks/useOpenFromQuery';
import { usePermission } from '@/hooks/usePermission';
import { cn } from '@/lib/utils';
import { useStudents, type StudentRow } from '../api';
import { NewPatientDialog } from '../components/NewPatientDialog';
import { ageOf } from '../age';

type StatusFilter = 'all' | StudentRow['status'];
const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'waitlist', label: 'Waitlist' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'discharged', label: 'Discharged' },
];

const VIEW_KEY = 'xenocare.patients.view';
function readView(): 'cards' | 'table' {
  try {
    return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'cards';
  } catch {
    return 'cards';
  }
}

const digits = (p: string) => p.replace(/\D/g, '');

export function StudentsPage() {
  const { branchId, isAll } = useBranch();
  const canManage = usePermission('students.manage');
  const { profile } = useAuth();
  const isTherapist = profile?.role === 'therapist';
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [view, setViewState] = useState(readView);
  const [adding, setAdding] = useState(false);
  useOpenFromQuery(useCallback(() => setAdding(true), []), canManage);
  const { data, isLoading, error } = useStudents({ branchId: isAll ? null : branchId, search });

  const setView = (v: 'cards' | 'table') => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* storage unavailable */
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: data?.length ?? 0 };
    for (const s of data ?? []) c[s.status] = (c[s.status] ?? 0) + 1;
    return c;
  }, [data]);
  const rows = (data ?? []).filter((s) => status === 'all' || s.status === status);
  const empty = !isLoading && rows.length === 0;
  const emptyTitle = search ? `No patients match “${search}”` : status !== 'all' ? 'No patients with this status' : 'No patients yet';
  const emptyAction = !search && status === 'all' && canManage ? <Button size="sm" onClick={() => setAdding(true)}><Plus /> New patient</Button> : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Clinic"
        title={isTherapist ? 'My patients' : 'Patients'}
        icon={UserRound}
        description={
          isTherapist
            ? 'Children on your caseload'
            : canManage
              ? 'Every child registered at your branch'
              : 'Patients across branches (registered by branch admins)'
        }
        actions={
          canManage && (
            <Button size="lg" onClick={() => setAdding(true)}>
              <Plus /> New patient
            </Button>
          )
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-80">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            placeholder="Search by name or patient code"
            className="h-11 pr-9 pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search patients"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground" aria-label="Clear search">
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-none lg:mx-0 lg:px-0" role="tablist" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={status === f.value}
              onClick={() => setStatus(f.value)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors',
                status === f.value ? 'border-brand-ink bg-brand-ink text-white dark:border-primary dark:bg-primary dark:text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
              <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', status === f.value ? 'bg-white/20' : 'bg-muted')}>{counts[f.value] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto hidden rounded-xl bg-muted p-1 md:flex" role="group" aria-label="View">
          {(['cards', 'table'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold', view === v ? 'bg-card shadow-sm' : 'text-muted-foreground')}
            >
              {v === 'cards' ? <LayoutGrid className="size-3.5" /> : <List className="size-3.5" />}
              {v === 'cards' ? 'Cards' : 'Table'}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error.message}</p>}

      {view === 'cards' && <CardsView rows={rows} loading={isLoading} isAll={isAll} empty={empty} emptyTitle={emptyTitle} emptyAction={emptyAction} />}
      {view === 'table' && (
        <>
          <div className="md:hidden">
            <CardsView rows={rows} loading={isLoading} isAll={isAll} empty={empty} emptyTitle={emptyTitle} emptyAction={emptyAction} />
          </div>
          <Card className="hidden py-2 md:flex">
            <CardContent className="px-2 sm:px-3">
              <TableView rows={rows} loading={isLoading} isAll={isAll} empty={empty} emptyTitle={emptyTitle} emptyAction={emptyAction} />
            </CardContent>
          </Card>
        </>
      )}
      <NewPatientDialog open={adding} onOpenChange={setAdding} />
    </>
  );
}

interface ViewProps {
  rows: StudentRow[];
  loading: boolean;
  isAll: boolean;
  empty: boolean;
  emptyTitle: string;
  emptyAction?: React.ReactNode;
}

function ContactButtons({ phone }: { phone: string | null | undefined }) {
  if (!phone) return null;
  return (
    <span className="flex gap-1">
      <a
        href={`tel:${phone}`}
        onClick={(e) => e.stopPropagation()}
        className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
        aria-label={`Call ${phone}`}
      >
        <Phone className="size-3.5" />
      </a>
      <a
        href={`https://wa.me/${digits(phone)}`}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="flex size-8 items-center justify-center rounded-lg bg-success-soft text-success transition-opacity hover:opacity-80"
        aria-label={`WhatsApp ${phone}`}
      >
        <MessageCircle className="size-3.5" />
      </a>
    </span>
  );
}

function CardsView({ rows, loading, isAll, empty, emptyTitle, emptyAction }: ViewProps) {
  const navigate = useNavigate();
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
      </div>
    );
  }
  if (empty) {
    return (
      <Card>
        <EmptyState icon={UserRound} title={emptyTitle} action={emptyAction} />
      </Card>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((s) => {
        const care = s.student_therapists.filter((t) => !t.end_date);
        const types = [...new Set(care.map((t) => t.therapy_type))];
        const parent = s.student_parents[0]?.parents;
        const name = `${s.first_name} ${s.last_name ?? ''}`.trim();
        const age = ageOf(s.date_of_birth);
        return (
          <li key={s.id}>
            <article
              onClick={() => navigate(`/students/${s.id}`)}
              className="group flex h-full cursor-pointer flex-col rounded-2xl border border-border/70 bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift"
            >
              <div className="flex items-start gap-3">
                <UserAvatar name={name} className="size-12 text-sm" />
                <div className="min-w-0 flex-1">
                  <Link to={`/students/${s.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-display text-base font-bold group-hover:text-primary">
                    {name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    <span className="font-mono">{s.student_code}</span>
                    {age !== null && ` · ${age} yrs`}
                    {isAll && s.branches && ` · ${s.branches.name}`}
                  </p>
                </div>
                <StatusBadge status={s.status} />
              </div>

              <div className="mt-3 flex min-h-6 flex-wrap gap-1.5">
                {types.length ? types.map((t) => <TherapyChip key={t} type={t} short />) : <span className="text-xs text-muted-foreground">No therapist assigned</span>}
              </div>
              {care.length > 0 && (
                <p className="mt-2 truncate text-xs text-muted-foreground">
                  Care team: <span className="font-medium text-foreground">{[...new Set(care.map((t) => t.profiles?.full_name?.split(' ')[0]))].join(', ')}</span>
                </p>
              )}

              <div className="min-h-4 flex-1" />
              <div className="flex items-center justify-between gap-2 border-t border-dashed pt-3">
                <p className="min-w-0 truncate text-xs">
                  {parent ? (
                    <>
                      <span className="font-semibold">{parent.full_name}</span>
                      <span className="text-muted-foreground"> · {s.student_parents[0]?.relationship}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">No parent on file</span>
                  )}
                </p>
                <ContactButtons phone={parent?.whatsapp_number} />
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

function TableView({ rows, loading, isAll, empty, emptyTitle, emptyAction }: ViewProps) {
  const navigate = useNavigate();
  const cols = isAll ? 6 : 5;
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Patient</TableHead>
          <TableHead>Age</TableHead>
          <TableHead>Therapy & care team</TableHead>
          <TableHead>Parent</TableHead>
          {isAll && <TableHead>Branch</TableHead>}
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading && <TableSkeleton cols={cols} />}
        {empty && <EmptyTableRow cols={cols} icon={UserRound} title={emptyTitle} action={emptyAction} />}
        {rows.map((s) => {
          const care = s.student_therapists.filter((t) => !t.end_date);
          const parent = s.student_parents[0];
          const name = `${s.first_name} ${s.last_name ?? ''}`.trim();
          const age = ageOf(s.date_of_birth);
          return (
            <TableRow key={s.id} className="cursor-pointer" onClick={() => navigate(`/students/${s.id}`)}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <UserAvatar name={name} className="size-9" />
                  <div>
                    <Link to={`/students/${s.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold hover:text-primary">
                      {name}
                    </Link>
                    <div className="font-mono text-xs text-muted-foreground">{s.student_code}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="tabular-nums">{age !== null ? `${age} yrs` : '—'}</TableCell>
              <TableCell className="text-sm whitespace-normal">
                {care.length ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {care.map((t) => (
                      <span key={`${t.profiles?.full_name}-${t.therapy_type}`} className="inline-flex items-center gap-1">
                        <TherapyChip type={t.therapy_type} short />
                        <span className="text-xs text-muted-foreground">{t.profiles?.full_name?.split(' ')[0]}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell className="text-sm">
                {parent?.parents ? (
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{parent.parents.full_name}</div>
                      <div className="text-xs text-muted-foreground">{parent.relationship}</div>
                    </div>
                    <ContactButtons phone={parent.parents.whatsapp_number} />
                  </div>
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
  );
}
