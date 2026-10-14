import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormField, NativeSelect } from '@/components/common/FormField';
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
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranch';
import { THERAPY_LABELS } from '@/types/app';
import { useBranchTherapists, useCreatePatient } from '../api';

const schema = z
  .object({
    branch_id: z.string().min(1, 'Pick a branch'),
    first_name: z.string().trim().min(1, 'Enter the first name'),
    last_name: z.string().trim().optional(),
    date_of_birth: z.string().optional(),
    gender: z.enum(['male', 'female', 'other', 'unspecified']),
    diagnosis: z.string().optional(),
    notes: z.string().optional(),
    therapist_ids: z.array(z.string()),
    parent_name: z.string().trim().optional(),
    relationship: z.string(),
    whatsapp: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || v.replace(/\D/g, '').length >= 10, 'Enter a 10-digit mobile number'),
  })
  .refine((v) => !v.whatsapp || v.parent_name, { message: 'Enter the parent name', path: ['parent_name'] });
type FormValues = z.infer<typeof schema>;

export function NewPatientDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { branches } = useAuth();
  const { branch } = useBranch();
  const create = useCreatePatient();
  const { register, control, handleSubmit, reset, watch, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });
  const branchId = watch('branch_id');
  const { data: therapists, isLoading: loadingTherapists } = useBranchTherapists(branchId || null);

  useEffect(() => {
    if (!open) return;
    reset({
      branch_id: branch?.id ?? branches[0]?.id ?? '',
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: 'unspecified',
      diagnosis: '',
      notes: '',
      therapist_ids: [],
      parent_name: '',
      relationship: 'mother',
      whatsapp: '',
    });
  }, [open, branch, branches, reset]);

  const onSubmit = handleSubmit(async (v) => {
    try {
      const picked = (therapists ?? []).filter((t) => v.therapist_ids.includes(t.id));
      const student = await create.mutateAsync({
        branch_id: v.branch_id,
        first_name: v.first_name,
        last_name: v.last_name || undefined,
        date_of_birth: v.date_of_birth || undefined,
        gender: v.gender,
        diagnosis: (v.diagnosis ?? '').split(',').map((d) => d.trim()).filter(Boolean),
        notes: v.notes || undefined,
        therapists: picked.map((t) => ({ id: t.id, therapy_type: t.therapy_types[0] ?? 'other' })),
        parent: v.parent_name
          ? { full_name: v.parent_name, relationship: v.relationship, whatsapp_number: v.whatsapp || undefined }
          : undefined,
      });
      toast.success(`${v.first_name} registered`, { description: `Patient code ${student.student_code}` });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not register patient');
    }
  });

  const errors = formState.errors;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New patient</DialogTitle>
          <DialogDescription>Register the child, assign therapists and add a parent for WhatsApp updates.</DialogDescription>
        </DialogHeader>

        <form id="new-patient" onSubmit={onSubmit} className="space-y-5" noValidate>
          {branches.length > 1 && (
            <FormField label="Branch" id="p-branch" error={errors.branch_id?.message}>
              <NativeSelect id="p-branch" {...register('branch_id')}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </NativeSelect>
            </FormField>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="First name" id="p-first" error={errors.first_name?.message}>
              <Input id="p-first" {...register('first_name')} />
            </FormField>
            <FormField label="Last name" id="p-last">
              <Input id="p-last" {...register('last_name')} />
            </FormField>
            <FormField label="Date of birth" id="p-dob">
              <Input id="p-dob" type="date" max={new Date().toISOString().slice(0, 10)} {...register('date_of_birth')} />
            </FormField>
            <FormField label="Gender" id="p-gender">
              <NativeSelect id="p-gender" {...register('gender')}>
                <option value="unspecified">Not specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </NativeSelect>
            </FormField>
          </div>

          <FormField label="Diagnosis" id="p-diagnosis" hint="Separate with commas, e.g. ASD, Speech delay">
            <Input id="p-diagnosis" {...register('diagnosis')} />
          </FormField>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Therapists</legend>
            {loadingTherapists && <p className="text-sm text-muted-foreground">Loading…</p>}
            {therapists?.length === 0 && (
              <p className="text-sm text-muted-foreground">No therapists in this branch yet. Add them on the Staff page.</p>
            )}
            <Controller
              control={control}
              name="therapist_ids"
              render={({ field }) => (
                <div className="grid gap-2 sm:grid-cols-2">
                  {therapists?.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={field.value.includes(t.id)}
                        onCheckedChange={(c) =>
                          field.onChange(c === true ? [...field.value, t.id] : field.value.filter((x) => x !== t.id))
                        }
                      />
                      <span>
                        {t.full_name}
                        {t.therapy_types.length > 0 && (
                          <span className="text-muted-foreground"> · {t.therapy_types.map((x) => THERAPY_LABELS[x]).join(', ')}</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            />
          </fieldset>

          <fieldset className="space-y-3 rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">Parent / guardian</legend>
            <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
              <FormField label="Name" id="p-parent" error={errors.parent_name?.message}>
                <Input id="p-parent" {...register('parent_name')} />
              </FormField>
              <FormField label="Relationship" id="p-rel">
                <NativeSelect id="p-rel" {...register('relationship')}>
                  <option value="mother">Mother</option>
                  <option value="father">Father</option>
                  <option value="guardian">Guardian</option>
                  <option value="other">Other</option>
                </NativeSelect>
              </FormField>
            </div>
            <FormField label="WhatsApp number" id="p-wa" hint="Used for reminders. 10-digit Indian mobile is fine." error={errors.whatsapp?.message}>
              <Input id="p-wa" type="tel" placeholder="98765 43210" {...register('whatsapp')} />
            </FormField>
          </fieldset>

          <FormField label="Notes" id="p-notes">
            <Input id="p-notes" {...register('notes')} />
          </FormField>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="new-patient" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? 'Saving…' : 'Register patient'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
