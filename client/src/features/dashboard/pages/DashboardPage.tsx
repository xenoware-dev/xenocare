import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranch';
import { BranchDashboard } from '../components/BranchDashboard';
import { MyDay } from '../components/MyDay';
import { OwnerDashboard } from '../components/OwnerDashboard';

/** Therapist → My day · Owner on "All branches" → branch comparison · otherwise → branch dashboard. */
export function DashboardPage() {
  const { profile } = useAuth();
  const { isAll } = useBranch();
  if (profile?.role === 'therapist') return <MyDay />;
  if (profile?.role === 'owner' && isAll) return <OwnerDashboard />;
  return <BranchDashboard />;
}
