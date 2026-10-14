import {
  Building2,
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  Menu,
  NotebookPen,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { NavLink } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { AppRole } from '@/types/app';

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
}

/** The 4 screens each role uses most on a phone; everything else lives under "More". */
const TABS: Record<AppRole, Tab[]> = {
  therapist: [
    { to: '/', label: 'My day', icon: LayoutDashboard },
    { to: '/appointments', label: 'Schedule', icon: CalendarDays, permission: 'appointments.view' },
    { to: '/students', label: 'Patients', icon: UserRound, permission: 'students.view' },
    { to: '/sessions', label: 'Notes', icon: NotebookPen, permission: 'sessions.write' },
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

const itemClass = 'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition-colors';

/** Phone-only tab bar fixed to the bottom (safe-area aware). */
export function BottomNav({ onMore }: { onMore: () => void }) {
  const { profile, permissions } = useAuth();
  if (!profile) return null;
  const tabs = TABS[profile.role].filter((t) => !t.permission || permissions.has(t.permission));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden print:hidden"
      aria-label="Quick navigation"
    >
      <ul className="mx-auto flex max-w-md items-stretch gap-1">
        {tabs.map((t) => (
          <li key={t.to} className="flex flex-1">
            <NavLink
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) => cn(itemClass, isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
            >
              {({ isActive }) => (
                <>
                  <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors', isActive && 'bg-accent')}>
                    <t.icon className="size-5" aria-hidden />
                  </span>
                  <span className="truncate">{t.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
        <li className="flex flex-1">
          <button type="button" onClick={onMore} className={cn(itemClass, 'text-muted-foreground hover:text-foreground')}>
            <span className="flex h-7 w-12 items-center justify-center">
              <Menu className="size-5" aria-hidden />
            </span>
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}
