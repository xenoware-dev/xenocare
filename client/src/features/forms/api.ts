import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { FormTemplate } from './types';

/** Active templates of a kind (latest version first). Readable by every signed-in user. */
export function useTemplates(kind: FormTemplate['kind']) {
  return useQuery({
    queryKey: ['form-templates', kind],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_templates')
        .select('id, name, kind, therapy_type, version, schema')
        .eq('kind', kind)
        .eq('is_active', true)
        .order('name')
        .order('version', { ascending: false });
      if (error) throw error;
      return data as unknown as FormTemplate[];
    },
  });
}

export function useTemplate(id: string | null | undefined) {
  return useQuery({
    queryKey: ['form-template', id],
    enabled: !!id,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_templates')
        .select('id, name, kind, therapy_type, version, schema')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as unknown as FormTemplate;
    },
  });
}
