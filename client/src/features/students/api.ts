import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { TherapyType } from '@/types/app';

export interface StudentRow {
  id: string;
  student_code: string;
  first_name: string;
  last_name: string | null;
  date_of_birth: string | null;
  status: 'active' | 'on_hold' | 'discharged' | 'waitlist';
  branches: { name: string } | null;
  student_therapists: { therapy_type: TherapyType; end_date: string | null; profiles: { full_name: string } | null }[];
  student_parents: { relationship: string; parents: { full_name: string; whatsapp_number: string | null } | null }[];
}

/** RLS decides which students come back (branch admin / assigned therapist). */
export function useStudents(opts: { branchId: string | null; search: string }) {
  return useQuery({
    queryKey: ['students', opts],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase
        .from('students')
        .select(
          'id, student_code, first_name, last_name, date_of_birth, status, branches(name), student_therapists(therapy_type, end_date, profiles(full_name)), student_parents(relationship, parents(full_name, whatsapp_number))',
        )
        .is('deleted_at', null)
        .order('first_name')
        .limit(100);
      if (opts.branchId) q = q.eq('home_branch_id', opts.branchId);
      const term = opts.search.trim().replace(/[%,()]/g, '');
      if (term) q = q.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,student_code.ilike.%${term}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as StudentRow[];
    },
  });
}

export interface TherapistOption {
  id: string;
  full_name: string;
  therapy_types: TherapyType[];
}

/** Active therapists who work at `branchId`. */
export function useBranchTherapists(branchId: string | null) {
  return useQuery({
    queryKey: ['branch-therapists', branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, staff_branches!inner(branch_id), staff_details(therapy_types)')
        .eq('role', 'therapist')
        .eq('is_active', true)
        .is('deleted_at', null)
        .eq('staff_branches.branch_id', branchId!)
        .order('full_name');
      if (error) throw error;
      return (data as unknown as { id: string; full_name: string; staff_details: { therapy_types: TherapyType[] } | null }[]).map(
        (t): TherapistOption => ({ id: t.id, full_name: t.full_name, therapy_types: t.staff_details?.therapy_types ?? [] }),
      );
    },
  });
}

export interface PatientOption {
  id: string;
  student_code: string;
  first_name: string;
  last_name: string | null;
}

/** Active patients whose home branch is `branchId` (for booking). */
export function useBranchPatients(branchId: string | null) {
  return useQuery({
    queryKey: ['branch-patients', branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, student_code, first_name, last_name')
        .eq('home_branch_id', branchId!)
        .in('status', ['active', 'waitlist'])
        .is('deleted_at', null)
        .order('first_name');
      if (error) throw error;
      return data as PatientOption[];
    },
  });
}

export interface CreatePatientInput {
  branch_id: string;
  first_name: string;
  last_name?: string;
  date_of_birth?: string;
  gender: 'male' | 'female' | 'other' | 'unspecified';
  diagnosis: string[];
  notes?: string;
  therapists: { id: string; therapy_type: TherapyType }[];
  parent?: { full_name: string; whatsapp_number?: string; relationship: string };
}

/** Indian mobile numbers to E.164 ('98765 43210' → '+919876543210'). */
export function toE164(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (phone.trim().startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return `+${digits}`;
}

/**
 * Branch admin registers a patient: student row, care team (assigned therapists)
 * and the primary parent. RLS only lets the admin of `branch_id` do this.
 */
export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePatientInput) => {
      const { data: auth } = await supabase.auth.getUser();
      const me = auth.user?.id;

      const { data: student, error } = await supabase
        .from('students')
        .insert({
          home_branch_id: input.branch_id,
          first_name: input.first_name,
          last_name: input.last_name ?? null,
          date_of_birth: input.date_of_birth ?? null,
          gender: input.gender,
          diagnosis: input.diagnosis,
          notes: input.notes ?? null,
          created_by: me,
        })
        .select('id, student_code')
        .single();
      if (error) throw error;

      if (input.therapists.length) {
        const { error: tErr } = await supabase.from('student_therapists').insert(
          input.therapists.map((t) => ({
            student_id: student.id,
            therapist_id: t.id,
            branch_id: input.branch_id,
            therapy_type: t.therapy_type,
          })),
        );
        if (tErr) throw tErr;
      }

      if (input.parent) {
        const { data: parent, error: pErr } = await supabase
          .from('parents')
          .insert({
            full_name: input.parent.full_name,
            phone: input.parent.whatsapp_number ?? null,
            whatsapp_number: input.parent.whatsapp_number ? toE164(input.parent.whatsapp_number) : null,
            created_by: me,
          })
          .select('id')
          .single();
        if (pErr) throw pErr;
        const { error: spErr } = await supabase.from('student_parents').insert({
          student_id: student.id,
          parent_id: parent.id,
          relationship: input.parent.relationship,
          is_primary_contact: true,
        });
        if (spErr) throw spErr;
      }
      return student;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['branch-patients'] });
      qc.invalidateQueries({ queryKey: ['visible-patients'] });
    },
  });
}

export interface PatientPick extends PatientOption {
  home_branch_id: string;
}

/** Every patient the user may see (RLS): a therapist gets their assigned patients. */
export function useVisiblePatients() {
  return useQuery({
    queryKey: ['visible-patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, student_code, first_name, last_name, home_branch_id')
        .is('deleted_at', null)
        .neq('status', 'discharged')
        .order('first_name');
      if (error) throw error;
      return data as PatientPick[];
    },
  });
}

export interface StudentDetail {
  id: string;
  student_code: string;
  first_name: string;
  last_name: string | null;
  date_of_birth: string | null;
  gender: string;
  diagnosis: string[];
  medical_history: string | null;
  allergies: string | null;
  medications: string | null;
  school_name: string | null;
  status: StudentRow['status'];
  intake_date: string;
  notes: string | null;
  home_branch_id: string;
  branches: { name: string } | null;
  student_therapists: {
    therapist_id: string;
    therapy_type: TherapyType;
    start_date: string;
    end_date: string | null;
    profiles: { full_name: string; phone: string | null } | null;
  }[];
  student_parents: {
    relationship: string;
    is_primary_contact: boolean;
    parents: { full_name: string; phone: string | null; whatsapp_number: string | null; email: string | null } | null;
  }[];
}

export function useStudent(id: string | undefined) {
  return useQuery({
    queryKey: ['student', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(
          'id, student_code, first_name, last_name, date_of_birth, gender, diagnosis, medical_history, allergies, medications, school_name, status, intake_date, notes, home_branch_id, branches(name), student_therapists(therapist_id, therapy_type, start_date, end_date, profiles(full_name, phone)), student_parents(relationship, is_primary_contact, parents(full_name, phone, whatsapp_number, email))',
        )
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as StudentDetail | null;
    },
  });
}
