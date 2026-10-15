import { Building2, CalendarPlus, ClipboardList, FileBarChart, Plane, UserPlus, UserRoundPlus, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export interface QuickAction {
  label: string;
  hint: string;
  icon: LucideIcon;
  to: string;
}

/** Role-aware shortcuts for the most common "create" jobs (New menu, command palette, mobile + button). */
export function useQuickActions(): QuickAction[] {
  const { profile, permissions } = useAuth();
  const role = profile?.role;
  const can = (k: string) => permissions.has(k);
  return [
    { label: 'New appointment', hint: 'Book a session', icon: CalendarPlus, to: '/appointments?new=1', show: can('appointments.manage') },
    { label: 'New patient', hint: 'Register a child and parent', icon: UserRoundPlus, to: '/students?new=1', show: can('students.manage') },
    { label: 'New assessment', hint: 'Start an assessment form', icon: ClipboardList, to: '/assessments/new', show: can('assessments.write') },
    { label: 'New progress report', hint: 'Summarise progress for parents', icon: FileBarChart, to: '/reports/new', show: can('reports.write') },
    {
      label: role === 'owner' ? 'Add branch admin' : 'Add therapist',
      hint: 'Invite a team member',
      icon: UserPlus,
      to: '/staff?new=1',
      show: can('staff.manage'),
    },
    { label: 'New branch', hint: 'Open another centre', icon: Building2, to: '/branches?new=1', show: can('branches.manage') },
    { label: 'Request leave', hint: 'Ask for time off', icon: Plane, to: '/leave', show: role === 'therapist' },
  ]
    .filter((a) => a.show)
    .map(({ show: _show, ...a }) => a);
}
