import {
  Building2,
  CalendarPlus,
  ClipboardList,
  FileBarChart,
  Laptop,
  LogOut,
  Menu,
  Moon,
  Plane,
  Plus,
  Sun,
  UserPlus,
  UserRound,
  UserRoundPlus,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeChoice } from '@/providers/ThemeProvider';
import { BranchSwitcher } from './BranchSwitcher';
import { ROLE_LABEL } from './Sidebar';

interface QuickAction {
  label: string;
  icon: LucideIcon;
  to: string;
  show: boolean;
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const role = profile?.role;

  // Role-aware shortcuts for the most common "create" jobs.
  const actions: QuickAction[] = [
    { label: 'New appointment', icon: CalendarPlus, to: '/appointments?new=1', show: usePermission('appointments.manage') },
    { label: 'New patient', icon: UserRoundPlus, to: '/students?new=1', show: usePermission('students.manage') },
    { label: role === 'owner' ? 'Add branch admin' : 'Add therapist', icon: UserPlus, to: '/staff?new=1', show: usePermission('staff.manage') },
    { label: 'New branch', icon: Building2, to: '/branches?new=1', show: usePermission('branches.manage') },
    { label: 'New assessment', icon: ClipboardList, to: '/assessments/new', show: usePermission('assessments.write') },
    { label: 'New progress report', icon: FileBarChart, to: '/reports/new', show: usePermission('reports.write') },
    { label: 'Request leave', icon: Plane, to: '/leave', show: role === 'therapist' },
  ].filter((a) => a.show);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md md:px-6 print:hidden">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu />
      </Button>
      <BranchSwitcher />

      <div className="ml-auto flex items-center gap-2">
        {actions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5 rounded-full px-4">
                <Plus className="size-4" /> <span className="hidden sm:inline">New</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Create</DropdownMenuLabel>
              {actions.map((a) => (
                <DropdownMenuItem key={a.label} onSelect={() => navigate(a.to)}>
                  <a.icon className="text-muted-foreground" /> {a.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {profile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full ring-offset-2 ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
                <UserAvatar name={profile.full_name || profile.email} path={profile.avatar_url} className="size-9" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="font-normal">
                <p className="truncate text-sm font-semibold">{profile.full_name || 'Your account'}</p>
                <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
                <p className="mt-0.5 text-xs text-primary">{ROLE_LABEL[profile.role]}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate('/profile')}>
                <UserRound className="text-muted-foreground" /> My profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Appearance</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemeChoice)}>
                <DropdownMenuRadioItem value="light"><Sun className="text-muted-foreground" /> Light</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark"><Moon className="text-muted-foreground" /> Dark</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system"><Laptop className="text-muted-foreground" /> System</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={signOut} variant="destructive">
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
