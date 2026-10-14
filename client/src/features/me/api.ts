import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { zonedToUtc } from '@/lib/time';
import type { TherapyType } from '@/types/app';

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface Leave {
  id: string;
  profile_id: string;
  from_date: string;
  to_date: string;
  leave_type: string;
  reason: string | null;
  status: LeaveStatus;
  reviewed_at: string | null;
  created_at: string;
  staff: { full_name: string } | null;
  reviewer: { full_name: string } | null;
}

const LEAVE_SELECT =
  'id, profile_id, from_date, to_date, leave_type, reason, status, reviewed_at, created_at, staff:profiles!staff_leaves_profile_id_fkey(full_name), reviewer:profiles!staff_leaves_reviewed_by_fkey(full_name)';

export function useMyLeaves(profileId: string | undefined) {
  return useQuery({
    queryKey: ['leaves', 'mine', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_leaves')
        .select(LEAVE_SELECT)
        .eq('profile_id', profileId!)
        .order('from_date', { ascending: false });
      if (error) throw error;
      return data as unknown as Leave[];
    },
  });
}

/** Leave requests the signed-in admin can review (RLS: staff sharing a branch). */
export function useLeaveRequests(enabled: boolean) {
  return useQuery({
    queryKey: ['leaves', 'review'],
    enabled,
    queryFn: async () => {
      const since = new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('staff_leaves')
        .select(LEAVE_SELECT)
        .gte('to_date', since)
        .order('from_date');
      if (error) throw error;
      return data as unknown as Leave[];
    },
  });
}

export function useApplyLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { profile_id: string; from_date: string; to_date: string; leave_type: string; reason?: string }) => {
      const { error } = await supabase.from('staff_leaves').insert({ ...input, reason: input.reason ?? null });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
  });
}

export function useSetLeaveStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeaveStatus }) => {
      const review = status === 'approved' || status === 'rejected';
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('staff_leaves')
        .update({
          status,
          reviewed_by: review ? (auth.user?.id ?? null) : null,
          reviewed_at: review ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
  });
}

export interface StaffDetails {
  profile_id: string;
  designation: string | null;
  therapy_types: TherapyType[];
  employee_code: string | null;
  join_date: string | null;
}

export function useStaffDetails(profileId: string | undefined) {
  return useQuery({
    queryKey: ['staff-details', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_details')
        .select('profile_id, designation, therapy_types, employee_code, join_date')
        .eq('profile_id', profileId!)
        .maybeSingle();
      if (error) throw error;
      return data as StaffDetails | null;
    },
  });
}

export interface AvailabilitySlot {
  id: string;
  branch_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  branches: { name: string } | null;
}

export function useAvailability(profileId: string | undefined) {
  return useQuery({
    queryKey: ['availability', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('therapist_availability')
        // No direct FK to branches: the slot references staff_branches (profile_id, branch_id).
        .select('id, branch_id, weekday, start_time, end_time, staff_branches(branches(name))')
        .eq('profile_id', profileId!)
        .lte('effective_from', today)
        .or(`effective_to.is.null,effective_to.gte.${today}`)
        .order('weekday')
        .order('start_time');
      if (error) throw error;
      type Raw = Omit<AvailabilitySlot, 'branches'> & { staff_branches: { branches: { name: string } | null } | null };
      return (data as unknown as Raw[]).map(({ staff_branches, ...slot }) => ({ ...slot, branches: staff_branches?.branches ?? null }));
    },
  });
}

/** Branch admin edits a therapist's weekly hours (RLS: admin of that branch). */
export function useSaveAvailability(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (op: { add?: { branch_id: string; weekday: number; start_time: string; end_time: string }; removeId?: string }) => {
      if (op.removeId) {
        const { error } = await supabase.from('therapist_availability').delete().eq('id', op.removeId);
        if (error) throw error;
      }
      if (op.add) {
        const { error } = await supabase.from('therapist_availability').insert({ profile_id: profileId, ...op.add });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availability', profileId] }),
  });
}

export function useUpdateStaffDetails(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { designation?: string | null; therapy_types?: TherapyType[] }) => {
      const { data, error } = await supabase.from('staff_details').upsert({ profile_id: profileId, ...patch }).select('profile_id');
      if (error) throw error;
      if (!data?.length) throw new Error('You are not allowed to edit this profile');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-details', profileId] });
      qc.invalidateQueries({ queryKey: ['profile-details', profileId] });
      qc.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export interface MonthSummary {
  month: string;
  booked: number;
  completed: number;
  noShow: number;
  cancelled: number;
  notesSigned: number;
  byTherapy: Partial<Record<TherapyType, number>>;
}

/** A therapist's month (YYYY-MM): sessions booked / completed / missed and notes signed. */
export function useMonthSummary(profileId: string | undefined, month: string) {
  return useQuery({
    queryKey: ['month-summary', profileId, month],
    enabled: !!profileId,
    queryFn: async (): Promise<MonthSummary> => {
      const [y, m] = month.split('-').map(Number);
      const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
      const from = zonedToUtc(`${month}-01`, '00:00', 'Asia/Kolkata').toISOString();
      const to = zonedToUtc(`${next}-01`, '00:00', 'Asia/Kolkata').toISOString();
      const [appts, notes] = await Promise.all([
        supabase.from('appointments').select('status, therapy_type').eq('therapist_id', profileId!).gte('start_at', from).lt('start_at', to),
        supabase
          .from('therapy_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('therapist_id', profileId!)
          .eq('is_locked', true)
          .gte('session_date', `${month}-01`)
          .lt('session_date', `${next}-01`),
      ]);
      if (appts.error) throw appts.error;
      if (notes.error) throw notes.error;
      const rows = appts.data;
      const byTherapy: MonthSummary['byTherapy'] = {};
      for (const a of rows) {
        if (a.status !== 'completed') continue;
        const t = a.therapy_type as TherapyType;
        byTherapy[t] = (byTherapy[t] ?? 0) + 1;
      }
      return {
        month,
        booked: rows.filter((a) => a.status !== 'cancelled').length,
        completed: rows.filter((a) => a.status === 'completed').length,
        noShow: rows.filter((a) => a.status === 'no_show').length,
        cancelled: rows.filter((a) => a.status === 'cancelled').length,
        notesSigned: notes.count ?? 0,
        byTherapy,
      };
    },
  });
}

/**
 * Name / phone / photo of a staff profile (column grants allow only these).
 * RLS: the owner edits anyone; an admin edits therapists of their branches; nobody else.
 */
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; full_name?: string; phone?: string | null; avatar_url?: string | null }) => {
      const { data, error } = await supabase.from('profiles').update(patch).eq('id', id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('You are not allowed to edit this profile');
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      qc.invalidateQueries({ queryKey: ['profile-details', v.id] });
    },
  });
}

export interface ProfileDetails {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: 'owner' | 'admin' | 'therapist';
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  staff_details: { designation: string | null; therapy_types: TherapyType[]; employee_code: string | null; join_date: string | null } | null;
  staff_branches: { is_primary: boolean; branches: { name: string } | null }[];
}

export function useProfileDetails(id: string | undefined) {
  return useQuery({
    queryKey: ['profile-details', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, full_name, email, phone, role, avatar_url, is_active, created_at, staff_details(designation, therapy_types, employee_code, join_date), staff_branches(is_primary, branches(name))',
        )
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as unknown as ProfileDetails;
    },
  });
}

/** Uploads to avatars/{uid}/avatar.<ext> and returns the storage path. */
export async function uploadAvatar(userId: string, file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}

/** Private bucket → short-lived signed URL for display. */
export function useAvatarUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['avatar-url', path],
    enabled: !!path,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
