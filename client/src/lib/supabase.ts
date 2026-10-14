import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import type { Database } from '@/types/database.types';

/** Browser client (anon key). All reads/writes go through RLS. */
export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});
