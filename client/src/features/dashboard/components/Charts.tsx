import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Trends } from '../api';

const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 };
const shortDate = (d: string) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${d}T00:00:00Z`));

function TooltipBox({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">{children}</div>;
}

/** Weekly attendance % for the last 4 weeks (single series → title names it, no legend). */
export function AttendanceTrend({ weeks }: { weeks: Trends['weeks'] }) {
  const data = weeks.map((w) => ({ ...w, label: shortDate(w.weekStart) }));
  const hasData = data.some((w) => w.pct !== null);
  if (!hasData) return <p className="py-10 text-center text-sm text-muted-foreground">No attendance marked in the last 4 weeks.</p>;
  const last = [...data].reverse().find((w) => w.pct !== null);

  return (
    <div className="h-44" role="img" aria-label={`Weekly attendance, latest ${last?.pct ?? 0}%`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 24, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} />
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} unit="%" tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} />
          <Tooltip
            cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              const w = active ? (payload?.[0]?.payload as (typeof data)[number] | undefined) : undefined;
              if (!w) return null;
              return (
                <TooltipBox>
                  <p className="font-medium">Week of {w.label}</p>
                  <p className="tabular-nums">{w.pct === null ? 'No sessions marked' : `${w.pct}% attended`}</p>
                  <p className="text-muted-foreground tabular-nums">{w.attended} attended · {w.absent} absent</p>
                </TooltipBox>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="pct"
            connectNulls
            stroke="var(--chart-progress)"
            strokeWidth={2}
            dot={{ r: 4, fill: 'var(--chart-progress)', stroke: 'var(--card)', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: 'var(--chart-progress)', stroke: 'var(--card)', strokeWidth: 2 }}
            isAnimationActive={false}
          >
            <LabelList dataKey="pct" position="top" formatter={(v: number | null) => (v === null ? '' : `${v}%`)} fill="var(--foreground)" fontSize={11} offset={10} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Completed sessions this month per therapist (horizontal bars, value at the tip). */
export function WorkloadBars({ rows }: { rows: Trends['workload'] }) {
  if (!rows.length) return <p className="py-10 text-center text-sm text-muted-foreground">No completed sessions this month yet.</p>;
  const height = Math.max(120, rows.length * 40 + 24);
  return (
    <div style={{ height }} role="img" aria-label="Completed sessions this month per therapist">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 8 }} barCategoryGap={8}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="therapist" width={120} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: 'var(--muted)' }}
            content={({ active, payload }) => {
              const r = active ? (payload?.[0]?.payload as Trends['workload'][number] | undefined) : undefined;
              return r ? (
                <TooltipBox>
                  <p className="font-medium">{r.therapist}</p>
                  <p className="tabular-nums">{r.completed} completed sessions</p>
                </TooltipBox>
              ) : null;
            }}
          />
          <Bar dataKey="completed" fill="var(--chart-progress)" barSize={20} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey="completed" position="right" fill="var(--foreground)" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
