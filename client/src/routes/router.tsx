import { lazy, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { ProtectedRoute } from './ProtectedRoute';
import { RequirePermission } from './RequirePermission';

// Pages load on demand (smaller first download).
const AppointmentsPage = lazy(() => import('@/features/appointments/pages/AppointmentsPage').then((m) => ({ default: m.AppointmentsPage })));
const AssessmentEditorPage = lazy(() => import('@/features/assessments/pages/AssessmentEditorPage').then((m) => ({ default: m.AssessmentEditorPage })));
const AssessmentsPage = lazy(() => import('@/features/assessments/pages/AssessmentsPage').then((m) => ({ default: m.AssessmentsPage })));
const AttendancePage = lazy(() => import('@/features/attendance/pages/AttendancePage').then((m) => ({ default: m.AttendancePage })));
const BillingPage = lazy(() => import('@/features/billing/pages/BillingPage').then((m) => ({ default: m.BillingPage })));
const BranchesPage = lazy(() => import('@/features/branches/pages/BranchesPage').then((m) => ({ default: m.BranchesPage })));
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const NotFoundPage = lazy(() => import('@/features/errors/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const LeavePage = lazy(() => import('@/features/me/pages/LeavePage').then((m) => ({ default: m.LeavePage })));
const ProfilePage = lazy(() => import('@/features/me/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const ParentsPage = lazy(() => import('@/features/parents/pages/ParentsPage').then((m) => ({ default: m.ParentsPage })));
const ReportEditorPage = lazy(() => import('@/features/reports/pages/ReportEditorPage').then((m) => ({ default: m.ReportEditorPage })));
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const SessionNotePage = lazy(() => import('@/features/sessions/pages/SessionNotePage').then((m) => ({ default: m.SessionNotePage })));
const SessionsPage = lazy(() => import('@/features/sessions/pages/SessionsPage').then((m) => ({ default: m.SessionsPage })));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const StaffPage = lazy(() => import('@/features/staff/pages/StaffPage').then((m) => ({ default: m.StaffPage })));
const StudentDetailPage = lazy(() => import('@/features/students/pages/StudentDetailPage').then((m) => ({ default: m.StudentDetailPage })));
const StudentsPage = lazy(() => import('@/features/students/pages/StudentsPage').then((m) => ({ default: m.StudentsPage })));

const guard = (permission: string, page: ReactNode) => <RequirePermission permission={permission}>{page}</RequirePermission>;

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'students', element: guard('students.view', <StudentsPage />) },
          { path: 'students/:id', element: guard('students.view', <StudentDetailPage />) },
          { path: 'parents', element: guard('parents.manage', <ParentsPage />) },
          { path: 'appointments', element: guard('appointments.view', <AppointmentsPage />) },
          { path: 'attendance', element: guard('attendance.mark', <AttendancePage />) },
          { path: 'sessions', element: guard('sessions.write', <SessionsPage />) },
          { path: 'sessions/appointment/:appointmentId', element: guard('students.view', <SessionNotePage />) },
          { path: 'assessments', element: guard('assessments.write', <AssessmentsPage />) },
          { path: 'assessments/new', element: guard('assessments.write', <AssessmentEditorPage />) },
          { path: 'assessments/:id', element: guard('students.view', <AssessmentEditorPage />) },
          { path: 'reports', element: guard('reports.view', <ReportsPage />) },
          { path: 'reports/new', element: guard('reports.write', <ReportEditorPage />) },
          { path: 'reports/:id', element: guard('reports.view', <ReportEditorPage />) },
          { path: 'leave', element: <LeavePage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'billing', element: guard('billing.view', <BillingPage />) },
          { path: 'staff', element: guard('staff.view', <StaffPage />) },
          { path: 'branches', element: guard('branches.manage', <BranchesPage />) },
          { path: 'settings', element: guard('settings.manage', <SettingsPage />) },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
