export type AppRole = 'owner' | 'admin' | 'therapist';
export type TherapyType = 'speech' | 'ot' | 'physio' | 'other';

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: AppRole;
  avatar_url: string | null;
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  timezone: string;
}

export const THERAPY_LABELS: Record<TherapyType, string> = {
  speech: 'Speech therapy',
  ot: 'Occupational therapy',
  physio: 'Physiotherapy',
  other: 'Other',
};
