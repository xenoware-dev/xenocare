import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export interface BranchRow {
  id: string;
  code: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  staff_branches: { profiles: { role: string; is_active: boolean } | null }[];
}

/** All branches, including inactive ones (RLS: only the owner can write). */
export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, code, name, city, address, phone, is_active, staff_branches(profiles(role, is_active))')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data as unknown as BranchRow[];
    },
  });
}

export interface BranchInput {
  code: string;
  name: string;
  city?: string;
  address?: string;
  phone?: string;
  is_active: boolean;
}

/** Insert or update a branch, then reload the signed-in user's branch list (switcher, forms). */
export function useSaveBranch() {
  const qc = useQueryClient();
  const { reload } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...input }: BranchInput & { id?: string }) => {
      const row = { ...input, timezone: 'Asia/Kolkata' };
      const { error } = id
        ? await supabase.from('branches').update(row).eq('id', id)
        : await supabase.from('branches').insert(row);
      if (error) {
        if (error.code === '23505') throw new Error(`Branch code ${input.code} is already used`);
        throw error;
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['branches'] });
      await reload();
    },
  });
}
