import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { AppRole, TherapyType } from '@/types/app';

export interface StaffRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: AppRole;
  avatar_url: string | null;
  is_active: boolean;
  staff_branches: { branch_id: string; is_primary: boolean; branches: { name: string } | null }[];
  staff_details: { designation: string | null; therapy_types: TherapyType[] } | null;
}

/** RLS decides who comes back: owner sees everyone, admins see staff sharing a branch. */
export function useStaff() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, full_name, email, phone, role, avatar_url, is_active, staff_branches(branch_id, is_primary, branches(name)), staff_details(designation, therapy_types)',
        )
        .is('deleted_at', null)
        .order('full_name');
      if (error) throw error;
      return data as unknown as StaffRow[];
    },
  });
}

export interface CreateStaffInput {
  email: string;
  full_name: string;
  phone?: string;
  role: Exclude<AppRole, 'owner'>;
  branch_ids: string[];
  primary_branch_id?: string;
  designation?: string;
  therapy_types: TherapyType[];
  /** Omit for Google-only sign-in. */
  password?: string;
}

/** Express creates the auth user (service role), profile, branches and staff details. */
export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStaffInput) => api.post<{ id: string }>('/users', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

export function useSetStaffActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch<void>(`/users/${id}/status`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}
