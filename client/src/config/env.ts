function required(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing environment variable ${name} (see client/.env.example)`);
  return value;
}

export const env = {
  supabaseUrl: required('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY),
  apiUrl: import.meta.env.VITE_API_URL ?? '/api',
};
