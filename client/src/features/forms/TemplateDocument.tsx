import type { FormValues, GoalOption, TemplateField, TemplateSchema } from './types';

function isEmpty(v: unknown) {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

function text(field: TemplateField, v: unknown): string {
  if (isEmpty(v)) return '—';
  if (field.type === 'checkbox') return v ? 'Yes' : 'No';
  if (field.type === 'scale') return `${v} / ${field.max ?? 5}`;
  if (field.type === 'date') return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(String(v)));
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

/**
 * Read-only, report-style rendering of a form_templates schema (signed notes, final
 * assessments and reports). Long text fields read as paragraphs; short ones as label/value pairs.
 */
export function TemplateDocument({ schema, values, goals = [] }: { schema: TemplateSchema; values: FormValues; goals?: GoalOption[] }) {
  return (
    <div className="space-y-6">
      {schema.sections.map((section) => {
        const fields = section.fields;
        const short = fields.filter((f) => !['textarea', 'table', 'multiselect'].includes(f.type));
        const long = fields.filter((f) => ['textarea', 'multiselect'].includes(f.type));
        const tables = fields.filter((f) => f.type === 'table');
        return (
          <section key={section.key} className="break-inside-avoid">
            <h3 className="mb-2 border-b pb-1 text-xs font-bold tracking-[0.12em] text-primary uppercase print:text-black">
              {section.label}
            </h3>
            {short.length > 0 && (
              <dl className="mb-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                {short.map((f) => (
                  <div key={f.key} className="flex justify-between gap-4 border-b border-dashed py-1 text-sm">
                    <dt className="text-muted-foreground">{f.label}</dt>
                    <dd className="text-right font-medium">{text(f, values[section.key]?.[f.key])}</dd>
                  </div>
                ))}
              </dl>
            )}
            {long.map((f) => (
              <div key={f.key} className="mb-3">
                <p className="text-xs font-semibold text-muted-foreground">{f.label}</p>
                <p className="mt-0.5 text-sm leading-relaxed whitespace-pre-line">{text(f, values[section.key]?.[f.key])}</p>
              </div>
            ))}
            {tables.map((f) => {
              const rows = (values[section.key]?.[f.key] as Record<string, unknown>[] | undefined) ?? [];
              const cols = (f.columns ?? []).filter((c) => c.type !== 'goal_ref');
              return (
                <div key={f.key} className="overflow-x-auto">
                  <table className="w-full border text-sm">
                    <thead className="bg-muted/60 print:bg-transparent">
                      <tr>
                        <th className="border px-3 py-1.5 text-left font-semibold">Goal</th>
                        {cols.map((c) => <th key={c.key} className="border px-3 py-1.5 text-left font-semibold">{c.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 && (
                        <tr><td colSpan={cols.length + 1} className="border px-3 py-2 text-muted-foreground">—</td></tr>
                      )}
                      {rows.map((r, i) => (
                        <tr key={i}>
                          <td className="border px-3 py-1.5">{goals.find((g) => g.id === r.goal_id)?.description ?? 'Goal'}</td>
                          {cols.map((c) => <td key={c.key} className="border px-3 py-1.5">{text(c, r[c.key])}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
