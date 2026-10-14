import { NativeSelect } from '@/components/common/FormField';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { FormValues, GoalOption, TemplateField, TemplateSchema } from './types';

/**
 * Renders any form_templates schema (SOAP, assessments, progress reports).
 * Controlled: `values` in, `onChange(next)` out. `readOnly` for signed / final records.
 */
export function TemplateForm({
  schema,
  values,
  onChange,
  readOnly,
  goals = [],
  idPrefix = 'f',
}: {
  schema: TemplateSchema;
  values: FormValues;
  onChange: (next: FormValues) => void;
  readOnly?: boolean;
  /** Rows for 'table' fields that have a goal_ref column. */
  goals?: GoalOption[];
  idPrefix?: string;
}) {
  const setField = (section: string, field: string, v: unknown) =>
    onChange({ ...values, [section]: { ...(values[section] ?? {}), [field]: v } });

  return (
    <div className="space-y-6">
      {schema.sections.map((section) => (
        <section key={section.key} className="space-y-3">
          <h3 className="text-sm font-semibold tracking-wide text-primary uppercase">{section.label}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {section.fields.map((field) => {
              const id = `${idPrefix}-${section.key}-${field.key}`;
              const wide = field.type === 'textarea' || field.type === 'table' || field.type === 'multiselect';
              return (
                <div key={field.key} className={cn('space-y-2', wide && 'sm:col-span-2')}>
                  {field.type !== 'checkbox' && (
                    <Label htmlFor={id}>
                      {field.label}
                      {field.required && <span className="text-destructive"> *</span>}
                    </Label>
                  )}
                  <FieldInput
                    id={id}
                    field={field}
                    value={values[section.key]?.[field.key]}
                    onChange={(v) => setField(section.key, field.key, v)}
                    readOnly={readOnly}
                    goals={goals}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function FieldInput({
  id,
  field,
  value,
  onChange,
  readOnly,
  goals,
}: {
  id: string;
  field: TemplateField;
  value: unknown;
  onChange: (v: unknown) => void;
  readOnly?: boolean;
  goals: GoalOption[];
}) {
  switch (field.type) {
    case 'textarea':
      return (
        <Textarea id={id} rows={3} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} readOnly={readOnly} />
      );
    case 'number':
      return (
        <Input
          id={id}
          type="number"
          value={value === undefined || value === null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          readOnly={readOnly}
        />
      );
    case 'date':
      return <Input id={id} type="date" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} readOnly={readOnly} />;
    case 'select':
      return (
        <NativeSelect id={id} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} disabled={readOnly}>
          <option value="">—</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </NativeSelect>
      );
    case 'multiselect': {
      const selected = (value as string[]) ?? [];
      return (
        <div className="flex flex-wrap gap-x-4 gap-y-2" id={id}>
          {field.options?.map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selected.includes(o)}
                disabled={readOnly}
                onCheckedChange={(c) => onChange(c === true ? [...selected, o] : selected.filter((x) => x !== o))}
              />
              {o}
            </label>
          ))}
        </div>
      );
    }
    case 'checkbox':
      return (
        <label className="flex items-center gap-2 pt-6 text-sm font-medium">
          <Checkbox id={id} checked={value === true} disabled={readOnly} onCheckedChange={(c) => onChange(c === true)} />
          {field.label}
        </label>
      );
    case 'scale': {
      const min = field.min ?? 1;
      const max = field.max ?? 5;
      const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      return (
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-labelledby={id} id={id}>
          {steps.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              disabled={readOnly}
              onClick={() => onChange(value === n ? null : n)}
              className={cn(
                'size-9 rounded-md border text-sm tabular-nums transition-colors disabled:cursor-default',
                value === n ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      );
    }
    case 'table':
      return <GoalTable id={id} field={field} value={value} onChange={onChange} readOnly={readOnly} goals={goals} />;
    default:
      return <Input id={id} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} readOnly={readOnly} />;
  }
}

type Row = Record<string, unknown> & { goal_id: string };

/** A table with one row per goal (goal_ref column), other columns editable. */
function GoalTable({
  id,
  field,
  value,
  onChange,
  readOnly,
  goals,
}: {
  id: string;
  field: TemplateField;
  value: unknown;
  onChange: (v: unknown) => void;
  readOnly?: boolean;
  goals: GoalOption[];
}) {
  const rows = (value as Row[]) ?? [];
  const columns = (field.columns ?? []).filter((c) => c.type !== 'goal_ref');
  if (!goals.length) return <p className="text-sm text-muted-foreground">No active goals for this patient yet.</p>;

  const setCell = (goalId: string, key: string, v: unknown) => {
    const existing = rows.find((r) => r.goal_id === goalId);
    const next = existing
      ? rows.map((r) => (r.goal_id === goalId ? { ...r, [key]: v } : r))
      : [...rows, { goal_id: goalId, [key]: v }];
    onChange(next);
  };

  return (
    <div className="overflow-x-auto rounded-md border" id={id}>
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Goal</th>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2 text-left font-medium">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {goals.map((g) => {
            const row = rows.find((r) => r.goal_id === g.id);
            return (
              <tr key={g.id} className="border-t align-top">
                <td className="px-3 py-2">{g.description}</td>
                {columns.map((c) => (
                  <td key={c.key} className="min-w-28 px-3 py-2">
                    <FieldInput
                      id={`${id}-${g.id}-${c.key}`}
                      field={c}
                      value={row?.[c.key]}
                      onChange={(v) => setCell(g.id, c.key, v)}
                      readOnly={readOnly}
                      goals={[]}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
