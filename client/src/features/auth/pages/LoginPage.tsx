import { zodResolver } from '@hookform/resolvers/zod';
import { isAuthApiError } from '@supabase/supabase-js';
import { Activity, AlertCircle, CheckCircle2, Hand, Loader2, MessageCircle, Sparkles } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
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
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-brand-ink p-12 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 opacity-[0.15] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:20px_20px]" aria-hidden />
        <div className="absolute -top-32 -right-32 size-[30rem] rounded-full bg-primary/40 blur-3xl" aria-hidden />
        <div className="absolute -bottom-40 -left-24 size-[26rem] rounded-full bg-sunflower/25 blur-3xl" aria-hidden />

        <Logo tone="light" className="relative" />

        <div className="relative my-auto max-w-lg py-12">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-white/80 uppercase">
            <span className="size-1.5 rounded-full bg-sunflower" aria-hidden /> Clinic workspace
          </p>
          <h2 className="font-display text-5xl leading-[1.05] font-extrabold tracking-tight xl:text-6xl">
            Every child can <span className="relative text-sunflower">grow<svg viewBox="0 0 120 12" className="absolute -bottom-2 left-0 w-full" aria-hidden><path d="M2 8c30-6 80-8 116-2" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" /></svg></span> with the right support.
          </h2>
          <p className="mt-6 text-lg text-white/70">Schedules, session notes, goals and progress reports for every child, in one calm place.</p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {[
              { Icon: MessageCircle, label: 'Speech therapy' },
              { Icon: Hand, label: 'Occupational therapy' },
              { Icon: Activity, label: 'Physiotherapy' },
              { Icon: Sparkles, label: 'Special education' },
            ].map(({ Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-2 rounded-xl bg-white/[0.08] px-3 py-2 text-sm font-semibold ring-1 ring-white/10">
                <Icon className="size-4 text-sunflower" aria-hidden /> {label}
              </span>
            ))}
          </div>
        </div>

        <ul className="relative grid grid-cols-3 gap-4 border-t border-white/10 pt-6 text-sm text-white/70">
          {['Check-in in one tap', 'SOAP notes & SMART goals', 'Reports parents understand'].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> {t}
            </li>
          ))}
        </ul>
      </aside>

      {/* Sign-in */}
      <main className="relative flex items-center justify-center bg-background p-6">
        <div className="pointer-events-none absolute inset-0 bg-dots [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" aria-hidden />
        <div className="relative w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <Logo className="mb-8 justify-center lg:hidden" />
            <h1 className="text-4xl font-extrabold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground">Sign in with the Google account your clinic registered.</p>
          </div>

          <div className="space-y-4">
            <Button type="button" size="lg" variant="outline" className="h-13 w-full gap-3 rounded-2xl text-base shadow-soft" onClick={onGoogle} disabled={googleBusy || loading}>
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
              <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft" noValidate>
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
                <Button type="submit" size="lg" className="w-full" disabled={formState.isSubmitting}>
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
