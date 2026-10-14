import { Camera, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FormField, NativeSelect } from '@/components/common/FormField';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  uploadAvatar,
  useAvailability,
  useSaveAvailability,
  useStaffDetails,
  useUpdateProfile,
  useUpdateStaffDetails,
} from '@/features/me/api';
import { WEEKDAY_NAMES } from '@/features/me/pages/ProfilePage';
import { useAuth } from '@/hooks/useAuth';
import { THERAPY_LABELS, type TherapyType } from '@/types/app';
import type { StaffRow } from '../api';

/**
 * Edit a staff member: name, phone, photo, designation, and for therapists their therapies and weekly hours.
 * Owner edits admins + therapists; a branch admin edits therapists of their branches (enforced by RLS).
 */
export function StaffEditDialog({
  staff,
  open,
  onOpenChange,
}: {
  staff: StaffRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { branches } = useAuth();
  const { data: details } = useStaffDetails(open ? staff.id : undefined);
  const { data: slots } = useAvailability(open ? staff.id : undefined);
  const updateDetails = useUpdateStaffDetails(staff.id);
  const updateProfile = useUpdateProfile();
  const saveSlot = useSaveAvailability(staff.id);
  const isTherapist = staff.role === 'therapist';
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPath, setAvatarPath] = useState(staff.avatar_url);
  const [name, setName] = useState(staff.full_name);
  const [phone, setPhone] = useState(staff.phone ?? '');

  const [designation, setDesignation] = useState('');
  const [types, setTypes] = useState<TherapyType[]>([]);
  // Hours can only be set in branches the therapist works at and the admin manages.
  const slotBranches = branches.filter((b) => staff.staff_branches.some((sb) => sb.branch_id === b.id));
  const [slot, setSlot] = useState({ branch_id: '', weekday: 1, start_time: '09:00', end_time: '17:00' });

  useEffect(() => {
    if (!details) return;
    setDesignation(details.designation ?? '');
    setTypes(details.therapy_types ?? []);
  }, [details]);

  useEffect(() => {
    if (open) setSlot((s) => ({ ...s, branch_id: slotBranches[0]?.id ?? '' }));
  }, [open]);

  const saveDetails = async () => {
    if (!name.trim()) return toast.error('Enter a name');
    try {
      await updateProfile.mutateAsync({ id: staff.id, full_name: name.trim(), phone: phone.trim() || null });
      await updateDetails.mutateAsync({ designation: designation.trim() || null, therapy_types: isTherapist ? types : [] });
      toast.success(`${name.trim()} updated`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    }
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Pick an image under 5 MB');
    try {
      const path = await uploadAvatar(staff.id, file);
      await updateProfile.mutateAsync({ id: staff.id, avatar_url: path });
      setAvatarPath(path);
      toast.success('Photo updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload photo');
    }
  };

  const addSlot = async () => {
    if (!slot.branch_id) return toast.error('Pick a branch');
    if (slot.end_time <= slot.start_time) return toast.error('End time must be after start time');
    try {
      await saveSlot.mutateAsync({ add: slot });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add hours');
    }
  };

  const removeSlot = async (id: string) => {
    try {
      await saveSlot.mutateAsync({ removeId: id });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove hours');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {staff.role === 'admin' ? 'branch admin' : 'therapist'}</DialogTitle>
          <DialogDescription>{staff.email}</DialogDescription>
        </DialogHeader>

        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <UserAvatar name={name || staff.email} path={avatarPath} className="size-14 text-lg" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -right-1 -bottom-1 rounded-full border bg-background p-1.5 shadow-sm hover:bg-accent"
                aria-label="Change photo"
              >
                <Camera className="size-3.5" />
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
            </div>
            <p className="text-xs text-muted-foreground">They can't change these themselves; you manage their profile.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" id="ts-name">
              <Input id="ts-name" value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Phone" id="ts-phone">
              <Input id="ts-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Designation" id="ts-desig">
            <Input id="ts-desig" value={designation} onChange={(e) => setDesignation(e.target.value)} />
          </FormField>
          {isTherapist && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Therapies</legend>
            <div className="flex flex-wrap gap-4">
              {(Object.keys(THERAPY_LABELS) as TherapyType[]).map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={types.includes(t)}
                    onCheckedChange={(c) => setTypes(c === true ? [...types, t] : types.filter((x) => x !== t))}
                  />
                  {THERAPY_LABELS[t]}
                </label>
              ))}
            </div>
          </fieldset>
          )}
          <Button onClick={saveDetails} disabled={updateDetails.isPending || updateProfile.isPending} size="sm">Save changes</Button>
        </section>

        {isTherapist && (
        <section className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-medium">Weekly working hours</h3>
          {slots?.length === 0 && <p className="text-sm text-muted-foreground">No hours set.</p>}
          <ul className="space-y-1 text-sm">
            {slots?.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{WEEKDAY_NAMES[s.weekday]}</span>{' '}
                  <span className="tabular-nums">{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</span>
                  <span className="text-muted-foreground"> · {s.branches?.name}</span>
                </span>
                <Button variant="ghost" size="icon" onClick={() => removeSlot(s.id)} aria-label="Remove" disabled={saveSlot.isPending}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
          {slotBranches.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_6rem_6rem]">
              {slotBranches.length > 1 && (
                <NativeSelect aria-label="Branch" value={slot.branch_id} onChange={(e) => setSlot({ ...slot, branch_id: e.target.value })}>
                  {slotBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </NativeSelect>
              )}
              <NativeSelect aria-label="Day" value={slot.weekday} onChange={(e) => setSlot({ ...slot, weekday: Number(e.target.value) })}>
                {WEEKDAY_NAMES.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </NativeSelect>
              <Input type="time" aria-label="Start" value={slot.start_time} onChange={(e) => setSlot({ ...slot, start_time: e.target.value })} />
              <Input type="time" aria-label="End" value={slot.end_time} onChange={(e) => setSlot({ ...slot, end_time: e.target.value })} />
              <Button variant="outline" size="sm" onClick={addSlot} disabled={saveSlot.isPending} className="col-span-2 sm:col-span-4">
                Add hours
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">This therapist is not in any of your branches.</p>
          )}
        </section>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
