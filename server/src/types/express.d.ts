import type { AuthUser } from '../middleware/auth.js';
import type { DbClient } from '../lib/supabase.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      /** Supabase client scoped to the current user (RLS applies). */
      db?: DbClient;
      rawBody?: Buffer;
    }
  }
}

export {};
