import {
  Building2,
  CircleUser,
  Plane,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  NotebookPen,
  Settings,
  UserRound,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { AppRole } from '@/types/app';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Permission key from public.permissions; hidden when missing. */
  permission?: string;
  /** Only shown to these roles. */
  roles?: AppRole[];
  /** Label shown to therapists (their own view of the module). */
  therapistLabel?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard, therapistLabel: 'My day' }],
  },
  {
    label: 'Clinic',
    items: [
      { label: 'Patients', to: '/students', icon: UserRound, permission: 'students.view', therapistLabel: 'My patients' },
      { label: 'Parents', to: '/parents', icon: UsersRound, permission: 'parents.manage' },
      { label: 'Appointments', to: '/appointments', icon: CalendarDays, permission: 'appointments.view', therapistLabel: 'My schedule' },
      { label: 'Attendance', to: '/attendance', icon: ClipboardCheck, permission: 'attendance.mark' },
    ],
  },
  {
    label: 'Therapy',
    items: [
      { label: 'Session notes', to: '/sessions', icon: NotebookPen, permission: 'sessions.write' },
      { label: 'Assessments', to: '/assessments', icon: ClipboardList, permission: 'assessments.write' },
      { label: 'Progress reports', to: '/reports', icon: FileBarChart, permission: 'reports.view' },
    ],
  },
  {
    label: 'Me',
    items: [
      { label: 'My leave', to: '/leave', icon: Plane, roles: ['therapist'] },
      { label: 'My profile', to: '/profile', icon: CircleUser },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Billing', to: '/billing', icon: Wallet, permission: 'billing.view' },
      { label: 'Staff', to: '/staff', icon: Users, permission: 'staff.view' },
      { label: 'Branches', to: '/branches', icon: Building2, permission: 'branches.manage' },
      { label: 'Settings', to: '/settings', icon: Settings, permission: 'settings.manage' },
    ],
  },
];

/** Nav groups filtered to what this user may open. */
export function visibleNav(permissions: Set<string>, role: AppRole | undefined): NavGroup[] {
  return NAV.map((group) => ({
    ...group,
    items: group.items
      .filter((i) => (!i.permission || permissions.has(i.permission)) && (!i.roles || (role && i.roles.includes(role))))
      .map((i) => (role === 'therapist' && i.therapistLabel ? { ...i, label: i.therapistLabel } : i)),
  })).filter((g) => g.items.length);
}
