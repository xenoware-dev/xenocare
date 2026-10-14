import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Branch, Profile } from '@/types/app';

export interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  /** Branches the user can access (owner: all). */
  branches: Branch[];
  permissions: Set<string>;
  loading: boolean;
  /** Why the last sign-in (password or Google redirect) was rejected; shown on the login page. */
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  /** Redirects to Google. Only emails already added by the owner/admin can get in. */
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/** Sign-in succeeded at Supabase Auth but the account can't use the app. */
export class AccountAccessError extends Error {}

/** Error returned in the URL after an OAuth redirect (query or hash), then removed from the URL. */
function takeOAuthError(): string | null {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const code = params.get('error') ?? hash.get('error');
  if (!code) return null;
  const description = params.get('error_description') ?? hash.get('error_description') ?? '';
  window.history.replaceState(null, '', window.location.pathname);
  if (/signups? not allowed|not allowed for this instance/i.test(description)) {
    return 'This Google account is not registered. Ask your clinic owner or admin to add your email.';
  }
  return description || 'Google sign-in failed. Try again.';
}

export function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Sign-in failed. Try again.';
}

async function loadUserData(userId: string) {
  const [profile, branches, permissions] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, avatar_url, is_active, deleted_at')
      .eq('id', userId)
      .maybeSingle(),
    supabase.from('branches').select('id, code, name, timezone').is('deleted_at', null).eq('is_active', true).order('name'),
    supabase.rpc('my_permissions'),
  ]);
  if (profile.error) throw profile.error;
  if (!profile.data) throw new AccountAccessError('This account has no staff profile. Ask the owner to set it up.');
  if (!profile.data.is_active || profile.data.deleted_at) {
    throw new AccountAccessError('This account has been deactivated. Contact the clinic owner.');
  }
  return {
    profile: profile.data as Profile,
    branches: (branches.data ?? []) as Branch[],
    permissions: new Set<string>((permissions.data ?? []) as string[]),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clear = useCallback(() => {
    setSession(null);
    setProfile(null);
    setBranches([]);
    setPermissions(new Set());
  }, []);

  /** Loads profile/branches/permissions for a session. Throws if the account can't use the app. */
  const hydrate = useCallback(
    async (s: Session | null) => {
      if (!s) {
        clear();
        setLoading(false);
        return;
      }
      try {
        const data = await loadUserData(s.user.id);
        setSession(s);
        setProfile(data.profile);
        setBranches(data.branches);
        setPermissions(data.permissions);
      } catch (err) {
        // Inactive / missing profile: treat as signed out.
        await supabase.auth.signOut();
        clear();
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [clear],
  );

  const hydrateQuietly = useCallback((s: Session | null) => hydrate(s).catch(() => undefined), [hydrate]);

  useEffect(() => {
    const oauthError = takeOAuthError();
    if (oauthError) setAuthError(oauthError);
    // Also completes a Google redirect: getSession() exchanges the ?code= for a session.
    supabase.auth
      .getSession()
      .then(({ data }) => hydrate(data.session))
      .catch((err) => setAuthError(errorMessage(err)));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') {
        clear();
      } else if (event === 'USER_UPDATED') {
        // Defer: Supabase recommends not awaiting other supabase calls inside this callback.
        setTimeout(() => hydrateQuietly(s), 0);
      } else if (event === 'TOKEN_REFRESHED') {
        // Token refreshes don't change who the user is.
        setSession(s);
      }
      // SIGNED_IN is hydrated by signIn() itself, so the login page can show account errors.
    });
    return () => sub.subscription.unsubscribe();
  }, [hydrate, hydrateQuietly, clear]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      branches,
      permissions,
      loading,
      authError,
      signIn: async (email, password) => {
        setAuthError(null);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await hydrate(data.session);
      },
      signInWithGoogle: async () => {
        setAuthError(null);
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/login`, queryParams: { prompt: 'select_account' } },
        });
        if (error) throw error;
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      reload: () => hydrateQuietly(session),
    }),
    [session, profile, branches, permissions, loading, authError, hydrate, hydrateQuietly],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
