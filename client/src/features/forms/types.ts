/** Shape of form_templates.schema (see supabase/seed.sql). */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'date'
  | 'scale'
  | 'table'
  | 'goal_ref';

export interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  min?: number;
  max?: number;
  /** For type 'table'. A 'goal_ref' column makes one row per goal. */
  columns?: TemplateField[];
}

export interface TemplateSection {
  key: string;
  label: string;
  fields: TemplateField[];
}

export interface TemplateSchema {
  sections: TemplateSection[];
}

export interface FormTemplate {
  id: string;
  name: string;
  kind: 'assessment' | 'soap' | 'smart' | 'progress_report';
  therapy_type: string | null;
  version: number;
  schema: TemplateSchema;
}

/** Responses keyed by section, then field: { subjective: { parent_report: '...' } }. */
export type FormValues = Record<string, Record<string, unknown>>;

export interface GoalOption {
  id: string;
  description: string;
}

/** Required fields that are still empty, as "Section › Field" labels. */
export function missingRequired(schema: TemplateSchema, values: FormValues): string[] {
  const missing: string[] = [];
  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (!field.required) continue;
      const v = values[section.key]?.[field.key];
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
        missing.push(`${section.label} › ${field.label}`);
      }
    }
  }
  return missing;
}
