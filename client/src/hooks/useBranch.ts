import { useContext } from 'react';
import { ALL_BRANCHES, BranchContext } from '@/providers/BranchProvider';

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error('useBranch must be used inside <BranchProvider>');
  return { ...ctx, isAll: ctx.branchId === ALL_BRANCHES };
}
