import type { DbClient } from '../../lib/supabase.js';
import { unwrap } from '../../utils/AppError.js';

/**
 * Dashboard summary built from the security_invoker views, so the owner gets
 * every branch and an admin only their own. Optional branch filter.
 */
export async function getSummary(db: DbClient, opts: { branchId?: string; months: number }) {
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - (opts.months - 1), 1);
  const sinceIso = since.toISOString().slice(0, 10);

  const byBranch = <Q extends { eq: (column: 'branch_id', value: string) => Q }>(q: Q) =>
    opts.branchId ? q.eq('branch_id', opts.branchId) : q;

  const [revenue, dues, students, utilization] = await Promise.all([
    byBranch(db.from('v_branch_revenue_monthly').select('*')).gte('month', sinceIso).order('month'),
    byBranch(db.from('v_branch_dues_summary').select('*')),
    byBranch(db.from('v_students_by_branch').select('*')),
    byBranch(db.from('v_therapist_utilization').select('*')).gte('month', sinceIso),
  ]);

  const revenueRows = unwrap(revenue) ?? [];
  const duesRows = unwrap(dues) ?? [];
  const studentRows = unwrap(students) ?? [];

  return {
    totals: {
      revenue: revenueRows.reduce((s, r) => s + Number(r.revenue), 0),
      outstanding: duesRows.reduce((s, r) => s + Number(r.total_outstanding ?? 0), 0),
      overdue: duesRows.reduce((s, r) => s + Number(r.overdue_amount ?? 0), 0),
      active_students: studentRows.reduce((s, r) => s + Number(r.active_students), 0),
    },
    revenue_by_month: revenueRows,
    dues_by_branch: duesRows,
    students_by_branch: studentRows,
    therapist_utilization: unwrap(utilization),
  };
}
