import { ArrowRight, CornerDownLeft, Search, UserRound, type LucideIcon } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { avatarTone, initials } from '@/components/common/UserAvatar';
import { useVisiblePatients } from '@/features/students/api';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useQuickActions } from '@/routes/actions';
import { visibleNav } from '@/routes/nav';

const PaletteContext = createContext<{ open: () => void } | null>(null);

export function useCommandPalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error('useCommandPalette must be used inside <CommandPaletteProvider>');
  return ctx;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
export const PALETTE_SHORTCUT = isMac ? '⌘K' : 'Ctrl K';

/** Ctrl/⌘+K (or "/") anywhere opens a search over patients, actions and pages. */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName));
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const value = useMemo(() => ({ open: () => setOpen(true) }), []);

  return (
    <PaletteContext.Provider value={value}>
      {children}
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-brand-ink/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className="fixed inset-x-3 top-[max(1rem,env(safe-area-inset-top))] z-50 mx-auto max-w-xl overflow-hidden rounded-2xl border bg-popover shadow-lift outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] sm:top-[12vh]"
            aria-describedby={undefined}
          >
            <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
            <Palette onDone={() => setOpen(false)} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </PaletteContext.Provider>
  );
}

interface Entry {
  id: string;
  group: 'Patients' | 'Create' | 'Go to';
  label: string;
  hint?: string;
  icon?: LucideIcon;
  avatar?: string;
  to: string;
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD');

function Palette({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const { permissions, profile } = useAuth();
  const actions = useQuickActions();
  const canSeePatients = permissions.has('students.view');
  const patients = useVisiblePatients();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const entries = useMemo(() => {
    const term = norm(q.trim());
    const match = (...fields: (string | null | undefined)[]) => !term || fields.some((f) => f && norm(f).includes(term));

    const people: Entry[] = canSeePatients
      ? (patients.data ?? [])
          .filter((p) => match(`${p.first_name} ${p.last_name ?? ''}`, p.student_code))
          .slice(0, term ? 8 : 4)
          .map((p) => ({
            id: `p-${p.id}`,
            group: 'Patients',
            label: `${p.first_name} ${p.last_name ?? ''}`.trim(),
            hint: p.student_code,
            avatar: `${p.first_name} ${p.last_name ?? ''}`,
            to: `/students/${p.id}`,
          }))
      : [];
    const create: Entry[] = actions
      .filter((a) => match(a.label, a.hint))
      .map((a) => ({ id: `a-${a.to}`, group: 'Create', label: a.label, hint: a.hint, icon: a.icon, to: a.to }));
    const pages: Entry[] = visibleNav(permissions, profile?.role)
      .flatMap((g) => g.items.map((i) => ({ ...i, groupLabel: g.label })))
      .filter((i) => match(i.label, i.groupLabel))
      .map((i) => ({ id: `n-${i.to}`, group: 'Go to', label: i.label, hint: i.groupLabel, icon: i.icon, to: i.to }));
    return [...people, ...create, ...pages];
  }, [q, patients.data, canSeePatients, actions, permissions, profile?.role]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = (e: Entry | undefined) => {
    if (!e) return;
    onDone();
    navigate(e.to);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(entries.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(entries[active]);
    }
  };

  let lastGroup = '';
  return (
    <div onKeyDown={onKeyDown}>
      <div className="flex items-center gap-3 border-b px-4">
        <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={canSeePatients ? 'Search patients, actions, pages…' : 'Search actions and pages…'}
          className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
          aria-label="Search"
          role="combobox"
          aria-expanded
          aria-controls="palette-list"
          aria-activedescendant={entries[active] ? `palette-${entries[active].id}` : undefined}
        />
        <kbd className="hidden rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground sm:block">ESC</kbd>
      </div>
      <ul ref={listRef} id="palette-list" role="listbox" className="max-h-[min(60vh,26rem)] overflow-y-auto p-2">
        {entries.length === 0 && (
          <li className="px-3 py-10 text-center text-sm text-muted-foreground">
            {patients.isLoading ? 'Loading patients…' : `Nothing matches “${q}”`}
          </li>
        )}
        {entries.map((e, i) => {
          const header = e.group !== lastGroup ? e.group : null;
          lastGroup = e.group;
          const Icon = e.icon ?? UserRound;
          return (
            <li key={e.id} role="presentation">
              {header && <p className="px-3 pt-3 pb-1.5 text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">{header}</p>}
              <button
                type="button"
                id={`palette-${e.id}`}
                role="option"
                aria-selected={i === active}
                data-index={i}
                onMouseMove={() => setActive(i)}
                onClick={() => go(e)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                  i === active ? 'bg-accent text-accent-foreground' : 'text-foreground',
                )}
              >
                {e.avatar ? (
                  <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', avatarTone(e.avatar))}>
                    {initials(e.avatar)}
                  </span>
                ) : (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-4" aria-hidden />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{e.label}</span>
                  {e.hint && <span className={cn('block truncate text-xs text-muted-foreground', e.group === 'Patients' && 'font-mono')}>{e.hint}</span>}
                </span>
                {i === active ? <CornerDownLeft className="size-4 text-primary" aria-hidden /> : <ArrowRight className="size-4 text-muted-foreground/40" aria-hidden />}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="hidden items-center gap-4 border-t bg-muted/50 px-4 py-2 text-[11px] text-muted-foreground sm:flex">
        <span><kbd className="font-semibold">↑↓</kbd> move</span>
        <span><kbd className="font-semibold">↵</kbd> open</span>
        <span className="ml-auto">Tip: press <kbd className="font-semibold">/</kbd> anywhere to search</span>
      </div>
    </div>
  );
}
