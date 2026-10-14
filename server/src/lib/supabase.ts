import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import type { Database } from '../types/database.types.js';

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

/** Service-role client: bypasses RLS. Use only for system jobs and admin auth APIs. */
export const supabaseAdmin = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  noSession,
);

/** Client acting as the signed-in user, so RLS policies apply. Prefer this in request handlers. */
export function createUserClient(accessToken: string) {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    ...noSession,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export type DbClient = ReturnType<typeof createUserClient>;
