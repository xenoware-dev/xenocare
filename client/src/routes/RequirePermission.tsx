import type { ReactNode } from 'react';
import { ForbiddenPage } from '@/features/errors/pages/ForbiddenPage';
import { usePermission } from '@/hooks/usePermission';

export function RequirePermission({ permission, children }: { permission?: string; children: ReactNode }) {
  return usePermission(permission) ? children : <ForbiddenPage />;
}
