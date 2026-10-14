import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Branch } from '@/types/app';

export const ALL_BRANCHES = 'all';
const STORAGE_KEY = 'xenocare.branch';

export interface BranchContextValue {
  /** Selected branch id, or 'all' (owner only). */
  branchId: string;
  branch: Branch | null;
  setBranchId: (id: string) => void;
  canSelectAll: boolean;
}

export const BranchContext = createContext<BranchContextValue | null>(null);

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function BranchProvider({ children }: { children: ReactNode }) {
  const { branches, profile } = useAuth();
  const canSelectAll = profile?.role === 'owner';
  const [branchId, setBranchIdState] = useState<string>(() => readStored() ?? ALL_BRANCHES);

  // Keep the selection valid for this user.
  useEffect(() => {
    if (!profile) return;
    const valid = (canSelectAll && branchId === ALL_BRANCHES) || branches.some((b) => b.id === branchId);
    if (!valid) setBranchIdState(canSelectAll ? ALL_BRANCHES : (branches[0]?.id ?? ALL_BRANCHES));
  }, [profile, branches, branchId, canSelectAll]);

  const value = useMemo<BranchContextValue>(
    () => ({
      branchId,
      branch: branches.find((b) => b.id === branchId) ?? null,
      canSelectAll,
      setBranchId: (id) => {
        setBranchIdState(id);
        try {
          localStorage.setItem(STORAGE_KEY, id);
        } catch {
          /* storage unavailable */
        }
      },
    }),
    [branchId, branches, canSelectAll],
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}
