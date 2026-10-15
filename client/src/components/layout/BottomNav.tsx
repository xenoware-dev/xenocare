import { Building2, CalendarDays, ClipboardCheck, LayoutDashboard, Menu, NotebookPen, Plus, Search, UserRound, Users, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useQuickActions } from '@/routes/actions';
import type { AppRole } from '@/types/app';
import { useCommandPalette } from './CommandPalette';

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
}

/** The screens each role uses most on a phone, around a central "+" button; the rest lives under "More". */
const TABS: Record<AppRole, Tab[]> = {
  therapist: [
    { to: '/', label: 'My day', icon: LayoutDashboard },
    { to: '/appointments', label: 'Schedule', icon: CalendarDays, permission: 'appointments.view' },
    { to: '/sessions', label: 'Notes', icon: NotebookPen, permission: 'sessions.write' },
    { to: '/students', label: 'Patients', icon: UserRound, permission: 'students.view' },
  ],
  admin: [
    { to: '/', label: 'Home', icon: LayoutDashboard },
    { to: '/appointments', label: 'Schedule', icon: CalendarDays, permission: 'appointments.view' },
    { to: '/attendance', label: 'Check-in', icon: ClipboardCheck, permission: 'attendance.mark' },
    { to: '/students', label: 'Patients', icon: UserRound, permission: 'students.view' },
  ],
  owner: [
    { to: '/', label: 'Home', icon: LayoutDashboard },
    { to: '/branches', label: 'Branches', icon: Building2, permission: 'branches.manage' },
    { to: '/staff', label: 'Staff', icon: Users, permission: 'staff.view' },
    { to: '/students', label: 'Patients', icon: UserRound, permission: 'students.view' },
  ],
};

const itemClass = 'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl py-1 text-[10.5px] font-semibold transition-colors';

/** Phone-only tab bar fixed to the bottom (safe-area aware). */
export function BottomNav({ onMore }: { onMore: () => void }) {
  const { profile, permissions } = useAuth();
  const actions = useQuickActions();
  const [creating, setCreating] = useState(false);
  if (!profile) return null;
  const all = TABS[profile.role].filter((t) => !t.permission || permissions.has(t.permission));
  // With a + button there's room for 3 tabs + More; without it, 4.
  const tabs = actions.length ? all.slice(0, 3) : all;
  const left = tabs.slice(0, 2);
  const right = tabs.slice(2);

  const tab = (t: Tab) => (
    <li key={t.to} className="flex flex-1">
      <NavLink to={t.to} end={t.to === '/'} className={({ isActive }) => cn(itemClass, isActive ? 'text-primary' : 'text-muted-foreground')}>
        {({ isActive }) => (
          <>
            <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-all', isActive && 'bg-accent')}>
              <t.icon className="size-5" aria-hidden strokeWidth={isActive ? 2.4 : 2} />
            </span>
            <span className="truncate">{t.label}</span>
          </>
        )}
      </NavLink>
    </li>
  );

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/90 px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden print:hidden"
        aria-label="Quick navigation"
      >
        <ul className="mx-auto flex max-w-md items-stretch gap-1">
          {left.map(tab)}
          {actions.length > 0 && (
            <li className="flex flex-1 justify-center">
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="-mt-6 flex size-14 items-center justify-center rounded-2xl bg-brand-ink text-white shadow-lift ring-4 ring-background transition-transform active:scale-95 dark:bg-primary dark:text-primary-foreground"
                aria-label="Create"
              >
                <Plus className="size-6" strokeWidth={2.5} />
              </button>
            </li>
          )}
          {right.map(tab)}
          <li className="flex flex-1">
            <button type="button" onClick={onMore} className={cn(itemClass, 'text-muted-foreground')}>
              <span className="flex h-7 w-12 items-center justify-center">
                <Menu className="size-5" aria-hidden />
              </span>
              More
            </button>
          </li>
        </ul>
      </nav>
      <CreateSheet open={creating} onOpenChange={setCreating} />
    </>
  );
}

function CreateSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const actions = useQuickActions();
  const navigate = useNavigate();
  const palette = useCommandPalette();
  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">What would you like to do?</DialogTitle>
          <DialogDescription>Start something new, or find a patient.</DialogDescription>
        </DialogHeader>
        <button
          type="button"
          onClick={() => {
            onOpenChange(false);
            palette.open();
          }}
          className="flex items-center gap-3 rounded-xl border bg-muted/60 px-3.5 py-3 text-left text-sm text-muted-foreground"
        >
          <Search className="size-4" aria-hidden /> Search patients, pages…
        </button>
        <div className="grid grid-cols-2 gap-2.5">
          {actions.map((a) => (
            <button
              key={a.to}
              type="button"
              onClick={() => go(a.to)}
              className="flex flex-col items-start gap-2 rounded-2xl border bg-card p-3.5 text-left shadow-xs transition-colors active:bg-accent"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-primary">
                <a.icon className="size-[18px]" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-bold">{a.label}</span>
                <span className="block text-xs text-muted-foreground">{a.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
