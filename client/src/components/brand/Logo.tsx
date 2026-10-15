import { useId } from 'react';
import { cn } from '@/lib/utils';

/** Absolute brand mark: a child (sunflower head) held by two open leaves. */
export function LogoMark({ className }: { className?: string }) {
  // Unique per instance: a hidden copy (e.g. the desktop sidebar on a phone) must not own the gradient.
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" className={cn('size-9 shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2bb5a0" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
      <path d="M16 26c-6.6-1.4-9-7-8-12.6 4.2.6 7.2 3.6 8 8 .8-4.4 3.8-7.4 8-8 1 5.6-1.4 11.2-8 12.6z" fill="#fff" />
      <circle cx="16" cy="9.5" r="3.4" fill="#f5c84b" />
    </svg>
  );
}

/** Mark + wordmark. `tone="light"` for dark backgrounds. */
export function Logo({ className, tone = 'dark', subtitle = true }: { className?: string; tone?: 'dark' | 'light'; subtitle?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="leading-none">
        <span className={cn('block font-display text-xl font-extrabold tracking-tight', tone === 'light' ? 'text-white' : 'text-foreground')}>
          absolute<span className="text-sunflower">.</span>
        </span>
        {subtitle && (
          <span className={cn('mt-1 block text-[9px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase', tone === 'light' ? 'text-white/60' : 'text-muted-foreground')}>
            Special school &amp; therapy care
          </span>
        )}
      </span>
    </span>
  );
}
