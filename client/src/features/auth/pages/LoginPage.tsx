import { zodResolver } from '@hookform/resolvers/zod';
import { isAuthApiError } from '@supabase/supabase-js';
import { AlertCircle, CheckCircle2, HeartPulse, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { AccountAccessError } from '@/providers/AuthProvider';

/** Where to go after the Google redirect returns to /login. */
const REDIRECT_KEY = 'xenocare.redirectAfterLogin';

const schema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
type FormValues = z.infer<typeof schema>;

function signInErrorMessage(err: unknown) {
  if (err instanceof AccountAccessError) return err.message;
  if (isAuthApiError(err)) {
    if (err.code === 'invalid_credentials') return 'Incorrect email or password';
    if (err.code === 'email_not_confirmed') return 'This email has not been confirmed yet';
    if (err.status === 429) return 'Too many attempts. Wait a minute and try again.';
    return err.message;
  }
  return 'Could not reach the server. Check your connection and try again.';
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.6 10.6 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export function LoginPage() {
  const { session, profile, loading, authError, signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const from = (location.state as { from?: string } | null)?.from ?? '/';
  if (session && profile) {
    const saved = sessionStorage.getItem(REDIRECT_KEY);
    sessionStorage.removeItem(REDIRECT_KEY);
    return <Navigate to={saved ?? from} replace />;
  }

  const onGoogle = async () => {
    setError(null);
    setGoogleBusy(true);
    try {
      sessionStorage.setItem(REDIRECT_KEY, from);
      await signInWithGoogle(); // navigates away to Google
    } catch (err) {
      setGoogleBusy(false);
      setError(signInErrorMessage(err));
    }
  };
  const shownError = error ?? authError;

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(signInErrorMessage(err));
    }
  });

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10" aria-hidden />
        <div className="absolute -bottom-32 -left-16 size-[28rem] rounded-full bg-white/5" aria-hidden />
        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15">
            <HeartPulse className="size-6" aria-hidden />
          </span>
          <span className="text-2xl font-bold">Absolute</span>
        </div>
        <div className="relative mt-auto max-w-md space-y-6">
          <h2 className="text-4xl leading-tight font-bold">Every session, every goal, every child, in one place.</h2>
          <ul className="space-y-3 text-primary-foreground/85">
            {['Schedules and check-in for every branch', 'SOAP notes, SMART goals and progress charts', 'Progress reports parents can understand'].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <CheckCircle2 className="size-5 shrink-0" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-12 text-sm text-primary-foreground/70">Speech · Occupational therapy · Physiotherapy</p>
      </aside>

      {/* Sign-in */}
      <main className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground lg:hidden">
              <HeartPulse className="size-6" aria-hidden />
            </span>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground">Sign in with the Google account your clinic registered.</p>
          </div>

          <div className="space-y-4">
            <Button type="button" size="lg" variant="outline" className="h-12 w-full gap-3 text-base shadow-xs" onClick={onGoogle} disabled={googleBusy || loading}>
              {googleBusy || loading ? <Loader2 className="animate-spin" aria-hidden /> : <GoogleIcon />}
              Continue with Google
            </Button>

            {shownError && (
              <div className="flex gap-2 rounded-lg border border-destructive/30 bg-danger-soft p-3 text-sm text-destructive" role="alert">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{shownError}</span>
              </div>
            )}

            {!showPassword ? (
              <button type="button" onClick={() => setShowPassword(true)} className="block w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                Use email and password instead
              </button>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-card p-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoComplete="email" autoFocus {...register('email')} />
                  {formState.errors.email && <p className="text-sm text-destructive">{formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
                  {formState.errors.password && <p className="text-sm text-destructive">{formState.errors.password.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
                  {formState.isSubmitting ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground lg:text-left">
            No account? Ask your clinic owner or branch admin to add your email.
          </p>
        </div>
      </main>
    </div>
  );
}
