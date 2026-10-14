import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDate } from '@/lib/format';
import { progressValue, type Goal, type ProgressPoint } from '../api';

interface Datum {
  date: string;
  value: number;
  point: ProgressPoint;
}

const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 };

/**
 * One goal's progress across sessions (single series → no legend; the goal title names it).
 * Accuracy % when trials were counted, otherwise the recorded value. Target as a reference line.
 */
export function GoalProgressChart({ goal, points }: { goal: Goal; points: ProgressPoint[] }) {
  const data: Datum[] = points
    .map((p) => ({ date: p.recorded_at, value: progressValue(p), point: p }))
    .filter((d): d is Datum => d.value !== null);
  const usesPercent = points.some((p) => p.trials);
  const unit = usesPercent ? '%' : (goal.unit ?? '');
  // A target only lines up with the plotted scale if both are % (accuracy) or both are raw values.
  const target = goal.target_value !== null && (!usesPercent || goal.unit === '%') ? goal.target_value : null;

  if (data.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">No progress recorded yet. It appears after session notes record this goal.</p>;
  }

  const last = data[data.length - 1];
  const yMax = usesPercent ? 100 : Math.max(...data.map((d) => d.value), target ?? 0) * 1.15 || 10;

  return (
    <div className="space-y-2">
      <p className="text-sm">
        <span className="text-2xl font-semibold tabular-nums">{last.value}{unit}</span>
        <span className="text-muted-foreground"> latest · {data.length} session{data.length > 1 ? 's' : ''}</span>
        {target !== null && (
          <span className="text-muted-foreground"> · target {target}{unit}</span>
        )}
      </p>
      <div className="h-48" role="img" aria-label={`Progress for ${goal.description}: latest ${last.value}${unit}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeWidth={1} />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(d))}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: 'var(--chart-grid)' }}
              minTickGap={24}
            />
            <YAxis domain={[0, Math.ceil(yMax)]} tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} unit={unit === '%' ? '%' : ''} />
            {target !== null && (
              <ReferenceLine
                y={target}
                stroke="var(--muted-foreground)"
                strokeWidth={1}
                label={{ value: 'Target', position: 'insideTopRight', fill: 'var(--muted-foreground)', fontSize: 11 }}
              />
            )}
            <Tooltip
              cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
              content={({ active, payload }) => {
                const d = active ? (payload?.[0]?.payload as Datum | undefined) : undefined;
                if (!d) return null;
                const p = d.point;
                return (
                  <div className="rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                    <p className="font-medium">{formatDate(d.date)}</p>
                    <p className="tabular-nums">
                      {d.value}{unit}
                      {p.trials ? ` (${p.successes ?? 0}/${p.trials} trials)` : ''}
                    </p>
                    {p.prompt_level && <p className="text-muted-foreground">Prompt: {p.prompt_level}</p>}
                    {p.note && <p className="max-w-56 text-muted-foreground">{p.note}</p>}
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--chart-progress)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={{ r: 4, fill: 'var(--chart-progress)', stroke: 'var(--card)', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: 'var(--chart-progress)', stroke: 'var(--card)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Show as table</summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 font-medium">Date</th>
              <th className="py-1 font-medium">Result</th>
              <th className="py-1 font-medium">Trials</th>
              <th className="py-1 font-medium">Prompt</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {data.map((d) => (
              <tr key={d.point.id} className="border-t">
                <td className="py-1">{formatDate(d.date)}</td>
                <td className="py-1">{d.value}{unit}</td>
                <td className="py-1">{d.point.trials ? `${d.point.successes ?? 0}/${d.point.trials}` : '—'}</td>
                <td className="py-1">{d.point.prompt_level ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
