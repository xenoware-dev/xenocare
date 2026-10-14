import { Camera, CircleUser, Lock } from 'lucide-react';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FormField } from '@/components/common/FormField';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { todayIn } from '@/lib/time';
import { THERAPY_LABELS, type TherapyType } from '@/types/app';
import { uploadAvatar, useAvailability, useMonthSummary, useStaffDetails, useUpdateProfile } from '../api';

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ROLE_LABEL = { owner: 'Owner', admin: 'Branch admin', therapist: 'Therapist' } as const;

export function ProfilePage() {
  const { profile, branches, reload } = useAuth();
  const isTherapist = profile?.role === 'therapist';
  const { data: details } = useStaffDetails(profile?.id);
  const update = useUpdateProfile();
  // Only the owner edits their own profile; admins and therapists are managed by the person above them.
  const canEditSelf = profile?.role === 'owner';
  const managedBy = profile?.role === 'admin' ? 'the clinic owner' : 'your branch admin or the clinic owner';
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name);
    setPhone(profile.phone ?? '');
  }, [profile]);

  if (!profile) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Enter your name');
    try {
      await update.mutateAsync({ id: profile.id, full_name: name.trim(), phone: phone.trim() || null });
      await reload();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update profile');
    }
  };

  const onAvatar = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Pick an image under 5 MB');
    try {
      const path = await uploadAvatar(profile.id, file);
      await update.mutateAsync({ id: profile.id, avatar_url: path });
      await reload();
      toast.success('Photo updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload photo');
    }
  };

  return (
    <>
      <PageHeader icon={CircleUser} title="My profile" description="Your details, working hours and monthly summary" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            {!canEditSelf && (
              <CardDescription className="flex items-center gap-1.5">
                <Lock className="size-3.5" aria-hidden /> Managed by {managedBy}. Ask them to change your details.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="mb-5 flex items-center gap-4">
              <div className="relative">
                <UserAvatar name={profile.full_name || profile.email} path={profile.avatar_url} className="size-16 text-lg" />
                {canEditSelf && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="absolute -right-1 -bottom-1 rounded-full border bg-background p-1.5 shadow-sm hover:bg-accent"
                      aria-label="Change photo"
                    >
                      <Camera className="size-3.5" />
                    </button>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => onAvatar(e.target.files?.[0])} />
                  </>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{profile.email}</p>
                <Badge variant="secondary">{ROLE_LABEL[profile.role]}</Badge>
                <p className="mt-1 text-xs text-muted-foreground">You sign in with this Google account.</p>
              </div>
            </div>
            {canEditSelf ? (
              <form onSubmit={save} className="space-y-4">
                <FormField label="Name" id="me-name">
                  <Input id="me-name" value={name} onChange={(e) => setName(e.target.value)} />
                </FormField>
                <FormField label="Phone" id="me-phone">
                  <Input id="me-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </FormField>
                <Button type="submit" disabled={update.isPending}>Save</Button>
              </form>
            ) : (
              <div className="space-y-3 text-sm">
                <Row label="Name" value={profile.full_name || '—'} />
                <Row label="Phone" value={profile.phone || '—'} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Work</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Branches" value={profile.role === 'owner' ? 'All branches' : branches.map((b) => b.name).join(', ') || '—'} />
            {details && (
              <>
                <Row label="Designation" value={details.designation ?? '—'} />
                {isTherapist && (
                  <Row label="Therapies" value={details.therapy_types.map((t) => THERAPY_LABELS[t]).join(', ') || '—'} />
                )}
                {details.employee_code && <Row label="Employee code" value={details.employee_code} />}
              </>
            )}
            {!canEditSelf && <p className="pt-2 text-xs text-muted-foreground">Ask {managedBy} to change these.</p>}
          </CardContent>
        </Card>

        {isTherapist && <WorkingHours profileId={profile.id} />}
        {isTherapist && <MonthSummaryCard profileId={profile.id} />}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function WorkingHours({ profileId }: { profileId: string }) {
  const { data, isLoading } = useAvailability(profileId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Working hours</CardTitle>
        <CardDescription>Set by your branch admin; bookings follow these hours.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {data?.length === 0 && <p className="text-sm text-muted-foreground">No working hours set yet.</p>}
        <ul className="divide-y text-sm">
          {WEEKDAY_NAMES.map((day, i) => {
            const slots = data?.filter((s) => s.weekday === i) ?? [];
            if (!slots.length) return null;
            return (
              <li key={day} className="flex justify-between gap-4 py-2">
                <span className="font-medium">{day}</span>
                <span className="text-right text-muted-foreground tabular-nums">
                  {slots.map((s) => `${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)} (${s.branches?.name ?? ''})`).join(', ')}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function MonthSummaryCard({ profileId }: { profileId: string }) {
  const [month, setMonth] = useState(() => todayIn('Asia/Kolkata').slice(0, 7));
  const { data, isLoading, error } = useMonthSummary(profileId, month);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>This month</CardTitle>
          <CardDescription>Your sessions and notes</CardDescription>
        </div>
        <Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="w-auto" aria-label="Month" />
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">{error.message}</p>}
        {isLoading || !data ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Booked" value={data.booked} />
              <Stat label="Completed" value={data.completed} />
              <Stat label="No-show" value={data.noShow} />
              <Stat label="Notes signed" value={data.notesSigned} />
            </dl>
            {data.completed > 0 && (
              <ul className="space-y-1 border-t pt-3 text-sm">
                {(Object.entries(data.byTherapy) as [TherapyType, number][]).map(([t, n]) => (
                  <li key={t} className="flex justify-between tabular-nums">
                    <span>{THERAPY_LABELS[t]}</span>
                    <span>{n} completed</span>
                  </li>
                ))}
              </ul>
            )}
            {data.completed > data.notesSigned && (
              <p className="text-xs text-muted-foreground">
                {data.completed - data.notesSigned} completed session(s) still need a signed note.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
