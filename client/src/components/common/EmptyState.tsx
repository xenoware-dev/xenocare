import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Friendly "nothing here yet" block with an optional next action. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-10 text-center', className)}>
      <div className="relative mb-4">
        <span className="absolute -top-1 -right-2 size-4 rounded-full bg-sunflower/70" aria-hidden />
        <span className="absolute -bottom-1 -left-2 size-2.5 rounded-full bg-primary/30" aria-hidden />
        <div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-primary ring-1 ring-primary/10">
          <Icon className="size-6" aria-hidden />
        </div>
      </div>
      <p className="font-display text-base font-bold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
