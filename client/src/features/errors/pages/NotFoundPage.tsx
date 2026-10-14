import { Compass } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="The link may be old or mistyped."
      action={<Button asChild><Link to="/">Back to dashboard</Link></Button>}
      className="py-24"
    />
  );
}
