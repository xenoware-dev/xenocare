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
import { useBranchPatients, useBranchTherapists } from '@/features/students/api';
import { addDays, weekdayOf } from '@/lib/time';
import { THERAPY_LABELS, type Branch, type TherapyType } from '@/types/app';
import { useCreateBooking } from '../api';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const THERAPY_TYPES = Object.keys(THERAPY_LABELS) as TherapyType[];

const schema = z
  .object({
    student_id: z.string().min(1, 'Pick a patient'),
    therapist_id: z.string().min(1, 'Pick a therapist'),
    therapy_type: z.enum(['speech', 'ot', 'physio', 'other']),
    date: z.string().min(1, 'Pick a date'),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Pick a time'),
    duration_min: z.coerce.number().int().min(10).max(240),
    notes: z.string().optional(),
    repeat: z.boolean(),
    weekdays: z.array(z.number()),
    until: z.string().optional(),
  })
  .refine((v) => !v.repeat || v.weekdays.length > 0, { message: 'Pick at least one day', path: ['weekdays'] })
  .refine((v) => !v.repeat || (v.until && v.until >= v.date), { message: 'Pick an end date after the start', path: ['until'] });
type FormValues = z.input<typeof schema>;

export function NewAppointmentDialog({
  branch,
  date,
  open,
  onOpenChange,
}: {
  branch: Branch;
  date: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const book = useCreateBooking();
  const { data: patients } = useBranchPatients(branch.id);
  const { data: therapists } = useBranchTherapists(branch.id);
  const { register, control, handleSubmit, reset, watch, setValue, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });
  const [therapistId, repeat, startDate] = watch(['therapist_id', 'repeat', 'date']);

  useEffect(() => {
    if (!open) return;
    reset({
      student_id: '',
      therapist_id: '',
      therapy_type: 'speech',
      date,
      start_time: '10:00',
      duration_min: 45,
      notes: '',
      repeat: false,
      weekdays: [weekdayOf(date)],
      until: addDays(date, 27),
    });
  }, [open, date, reset]);

  // Default the therapy type to the chosen therapist's specialty.
  useEffect(() => {
    const t = therapists?.find((x) => x.id === therapistId);
    if (t?.therapy_types[0]) setValue('therapy_type', t.therapy_types[0]);
  }, [therapistId, therapists, setValue]);

  const onSubmit = handleSubmit(async (raw) => {
    const v = schema.parse(raw);
    try {
      const res = await book.mutateAsync({
        branch_id: branch.id,
        time_zone: branch.timezone,
        student_id: v.student_id,
        therapist_id: v.therapist_id,
        therapy_type: v.therapy_type,
        date: v.date,
        start_time: v.start_time,
        duration_min: v.duration_min,
        notes: v.notes || undefined,
        repeat: v.repeat ? { weekdays: v.weekdays, until: v.until! } : undefined,
      });
      if (res.kind === 'single') toast.success('Appointment booked');
      else
        toast.success(`${res.created} appointments booked`, {
          description: res.skipped.length
            ? `Skipped ${res.skipped.length}: ${res.skipped.map((s) => `${s.date} (${s.reason})`).join(', ')}`
            : undefined,
        });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not book appointment');
    }
  });

  const errors = formState.errors;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New appointment</DialogTitle>
          <DialogDescription>{branch.name}. Double bookings are blocked automatically.</DialogDescription>
        </DialogHeader>

        <form id="new-appointment" onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormField label="Patient" id="a-patient" error={errors.student_id?.message}>
            <NativeSelect id="a-patient" {...register('student_id')}>
              <option value="">Select a patient…</option>
              {patients?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name ?? ''} ({p.student_code})
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Therapist" id="a-therapist" error={errors.therapist_id?.message}>
              <NativeSelect id="a-therapist" {...register('therapist_id')}>
                <option value="">Select a therapist…</option>
                {therapists?.map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Therapy" id="a-type">
              <NativeSelect id="a-type" {...register('therapy_type')}>
                {THERAPY_TYPES.map((t) => (
                  <option key={t} value={t}>{THERAPY_LABELS[t]}</option>
                ))}
              </NativeSelect>
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Date" id="a-date" error={errors.date?.message}>
              <Input id="a-date" type="date" {...register('date')} />
            </FormField>
            <FormField label="Start time" id="a-time" error={errors.start_time?.message}>
              <Input id="a-time" type="time" step={300} {...register('start_time')} />
            </FormField>
            <FormField label="Duration" id="a-duration">
              <NativeSelect id="a-duration" {...register('duration_min')}>
                {[30, 45, 60, 90].map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </NativeSelect>
            </FormField>
          </div>

          <Controller
            control={control}
            name="repeat"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />
                Repeat weekly
              </label>
            )}
          />

          {repeat && (
            <div className="space-y-4 rounded-md border p-3">
              <Controller
                control={control}
                name="weekdays"
                render={({ field }) => (
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">On</legend>
                    <div className="flex flex-wrap gap-3">
                      {WEEKDAYS.map((label, i) => (
                        <label key={label} className="flex items-center gap-1.5 text-sm">
                          <Checkbox
                            checked={field.value.includes(i)}
                            onCheckedChange={(c) =>
                              field.onChange(c === true ? [...field.value, i] : field.value.filter((d) => d !== i))
                            }
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    {errors.weekdays && <p className="text-sm text-destructive">{errors.weekdays.message}</p>}
                  </fieldset>
                )}
              />
              <FormField label="Until" id="a-until" hint="Branch holidays are skipped." error={errors.until?.message}>
                <Input id="a-until" type="date" min={startDate} {...register('until')} />
              </FormField>
            </div>
          )}

          <FormField label="Notes" id="a-notes">
            <Input id="a-notes" {...register('notes')} />
          </FormField>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="new-appointment" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? 'Booking…' : 'Book'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
