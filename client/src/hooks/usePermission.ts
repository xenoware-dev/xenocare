import { useAuth } from '@/hooks/useAuth';

/** UI-level check. Real enforcement is RLS (database) and Express middleware. */
export function usePermission(key?: string) {
  const { permissions } = useAuth();
  return !key || permissions.has(key);
}
