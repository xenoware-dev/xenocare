import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  actions,
  icon: Icon,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: LucideIcon;
  /** Small label above the title (e.g. the section the page belongs to). */
  eyebrow?: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-7 sm:gap-4">
      <div className="flex min-w-0 items-start gap-3.5">
        {Icon && (
          <span className="mt-0.5 hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary ring-1 ring-primary/10 sm:flex">
            <Icon className="size-[22px]" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 text-[11px] font-bold tracking-[0.14em] text-primary uppercase">{eyebrow}</p>}
          <h1 className="text-2xl leading-tight font-extrabold tracking-tight sm:text-[2rem]">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground sm:text-[0.95rem]">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
