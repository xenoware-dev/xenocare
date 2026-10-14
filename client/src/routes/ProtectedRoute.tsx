import { Navigate, Outlet, useLocation } from 'react-router';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { useAuth } from '@/hooks/useAuth';

/** Requires a signed-in, active user. */
export function ProtectedRoute() {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen fullScreen />;
  if (!session || !profile) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
