import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  actions,
  icon: Icon,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="mt-0.5 hidden size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary sm:flex">
            <Icon className="size-5" aria-hidden />
          </span>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
