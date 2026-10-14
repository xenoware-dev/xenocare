import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';

export function ForbiddenPage() {
  return (
    <EmptyState
      icon={ShieldAlert}
      title="You don't have access to this page"
      description="Your role doesn't include this area. If you need it, ask your branch admin or the clinic owner."
      action={<Button asChild><Link to="/">Back to dashboard</Link></Button>}
      className="py-24"
    />
  );
}
