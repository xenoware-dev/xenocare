import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranch';
import { ALL_BRANCHES } from '@/providers/BranchProvider';

/** Which branch the screens show. Owners can also pick "All branches". */
export function BranchSwitcher() {
  const { branches } = useAuth();
  const { branchId, branch, setBranchId, canSelectAll } = useBranch();
  const label = branchId === ALL_BRANCHES ? 'All branches' : (branch?.name ?? 'Select branch');

  if (branches.length <= 1 && !canSelectAll) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm font-medium">
        <Building2 className="size-4 text-primary" aria-hidden /> {branches[0]?.name ?? 'No branch'}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 rounded-full bg-card" aria-label={`Branch: ${label}`}>
          <Building2 className="size-4 text-primary" aria-hidden />
          <span className="max-w-40 truncate">{label}</span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Show data for</DropdownMenuLabel>
        {canSelectAll && (
          <>
            <DropdownMenuItem onSelect={() => setBranchId(ALL_BRANCHES)}>
              <Check className={branchId === ALL_BRANCHES ? 'opacity-100' : 'opacity-0'} /> All branches
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {branches.map((b) => (
          <DropdownMenuItem key={b.id} onSelect={() => setBranchId(b.id)}>
            <Check className={branchId === b.id ? 'opacity-100' : 'opacity-0'} /> {b.name}
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">{b.code}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
