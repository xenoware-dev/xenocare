import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
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
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';
import { THERAPY_LABELS, type TherapyType } from '@/types/app';
import { useCreateStaff } from '../api';

const THERAPY_TYPES = Object.keys(THERAPY_LABELS) as TherapyType[];

const schema = z.object({
  full_name: z.string().trim().min(1, 'Enter a name'),
  email: z.email('Enter a valid email'),
  phone: z.string().trim().optional(),
  role: z.enum(['admin', 'therapist']),
  branch_ids: z.array(z.string()).min(1, 'Pick at least one branch'),
  designation: z.string().trim().optional(),
  therapy_types: z.array(z.enum(['speech', 'ot', 'physio', 'other'])),
  password: z.union([z.literal(''), z.string().min(8, 'At least 8 characters')]).optional(),
});
type FormValues = z.infer<typeof schema>;

export function AddStaffDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { branches, profile } = useAuth();
  const createStaff = useCreateStaff();
  // Workflow: the owner adds branch admins; a branch admin adds therapists.
  const role: FormValues['role'] = profile?.role === 'owner' ? 'admin' : 'therapist';
  const roleLabel = role === 'admin' ? 'branch admin' : 'therapist';
  const defaults: FormValues = {
    full_name: '',
    email: '',
    phone: '',
    role,
    branch_ids: branches.length === 1 ? [branches[0].id] : [],
    designation: '',
    therapy_types: [],
    password: '',
  };
  const { register, control, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (open) reset(defaults);
  }, [open]);

  const onSubmit = handleSubmit(async (v) => {
    try {
      await createStaff.mutateAsync({
        full_name: v.full_name,
        email: v.email,
        phone: v.phone || undefined,
        role: v.role,
        branch_ids: v.branch_ids,
        designation: v.designation || undefined,
        therapy_types: v.role === 'therapist' ? v.therapy_types : [],
        password: v.password || undefined,
      });
      toast.success(`${v.full_name} added`, {
        description: v.password
          ? 'They can sign in with Google or with the password you set.'
          : `They can now sign in with Google using ${v.email}.`,
      });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not add staff member');
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add {roleLabel}</DialogTitle>
          <DialogDescription>
            {role === 'admin'
              ? 'Branch admins add therapists, patients and appointments for their branches.'
              : 'Therapists see their own appointments and assigned patients.'}{' '}
            They sign in with Google using this email.
          </DialogDescription>
        </DialogHeader>

        <form id="add-staff" onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Full name" id="full_name" error={formState.errors.full_name?.message}>
            <Input id="full_name" {...register('full_name')} />
          </Field>

          <Field label="Email (Google account)" id="email" error={formState.errors.email?.message}>
            <Input id="email" type="email" autoComplete="off" {...register('email')} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" id="phone">
              <Input id="phone" type="tel" {...register('phone')} />
            </Field>
            <Field label="Designation" id="designation">
              <Input id="designation" placeholder={role === 'admin' ? 'e.g. Centre manager' : 'e.g. Speech therapist'} {...register('designation')} />
            </Field>
          </div>

          <Controller
            control={control}
            name="branch_ids"
            render={({ field }) => (
              <CheckboxGroup
                legend="Branches"
                error={formState.errors.branch_ids?.message}
                options={branches.map((b) => ({ value: b.id, label: b.name }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />

          {role === 'therapist' && (
            <Controller
              control={control}
              name="therapy_types"
              render={({ field }) => (
                <CheckboxGroup
                  legend="Therapy types"
                  options={THERAPY_TYPES.map((t) => ({ value: t, label: THERAPY_LABELS[t] }))}
                  value={field.value}
                  onChange={(v) => field.onChange(v as TherapyType[])}
                />
              )}
            />
          )}

          <Field
            label="Password (optional)"
            id="password"
            hint="Leave empty for Google-only sign-in."
            error={formState.errors.password?.message}
          >
            <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
          </Field>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="add-staff" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? 'Adding…' : `Add ${roleLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  id,
  hint,
  error,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function CheckboxGroup({
  legend,
  options,
  value,
  onChange,
  error,
}: {
  legend: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}) {
  const toggle = (v: string, checked: boolean) =>
    onChange(checked ? [...value, v] : value.filter((x) => x !== v));
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm">
            <Checkbox checked={value.includes(o.value)} onCheckedChange={(c) => toggle(o.value, c === true)} />
            {o.label}
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </fieldset>
  );
}
