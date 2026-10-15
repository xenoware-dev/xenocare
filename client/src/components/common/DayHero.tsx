import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** First name for greetings, skipping titles like "Dr." or "Mrs.". */
export function firstName(full: string | null | undefined) {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean);
  const name = parts.find((p) => !/^(dr|mr|mrs|ms|miss|prof)\.?$/i.test(p));
  return name ?? 'there';
}

/** The warm banner at the top of each dashboard. */
export function DayHero({
  eyebrow,
  title,
  description,
  aside,
  actions,
  children,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('relative overflow-hidden rounded-3xl border border-border/70 bg-hero p-5 shadow-soft sm:p-7', className)}>
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-60 [mask-image:linear-gradient(to_left,black,transparent_60%)]" aria-hidden />
      <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/70 px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-primary uppercase">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              {eyebrow}
            </p>
          )}
          <h1 className="text-[1.75rem] leading-[1.1] font-extrabold tracking-tight sm:text-[2.4rem]">{title}</h1>
          {description && <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">{description}</p>}
          {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
        </div>
        {aside && <div className="hidden sm:block">{aside}</div>}
      </div>
      {children && <div className="relative mt-6">{children}</div>}
    </section>
  );
}
