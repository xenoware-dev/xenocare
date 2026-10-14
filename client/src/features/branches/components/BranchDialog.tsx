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
import { useSaveBranch, type BranchRow } from '../api';

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a name'),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,10}$/, '2–10 letters or digits, e.g. GDV'),
  city: z.string().trim().optional(),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  is_active: z.boolean(),
});
type FormValues = z.input<typeof schema>;

export function BranchDialog({
  branch,
  open,
  onOpenChange,
}: {
  /** null = create a new branch */
  branch: BranchRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const save = useSaveBranch();
  const { register, control, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: branch?.name ?? '',
      code: branch?.code ?? '',
      city: branch?.city ?? 'Chennai',
      address: branch?.address ?? '',
      phone: branch?.phone ?? '',
      is_active: branch?.is_active ?? true,
    });
  }, [open, branch, reset]);

  const onSubmit = handleSubmit(async (raw) => {
    const v = schema.parse(raw);
    try {
      await save.mutateAsync({
        id: branch?.id,
        name: v.name,
        code: v.code,
        city: v.city || undefined,
        address: v.address || undefined,
        phone: v.phone || undefined,
        is_active: v.is_active,
      });
      toast.success(branch ? `${v.name} updated` : `${v.name} created`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save branch');
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{branch ? `Edit ${branch.name}` : 'New branch'}</DialogTitle>
          <DialogDescription>The code appears in invoice numbers, e.g. GDV-2026-00001.</DialogDescription>
        </DialogHeader>
        <form id="branch-form" onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <div className="space-y-2">
              <Label htmlFor="b-name">Name</Label>
              <Input id="b-name" {...register('name')} />
              {formState.errors.name && <p className="text-sm text-destructive">{formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-code">Code</Label>
              <Input id="b-code" className="uppercase" {...register('code')} />
              {formState.errors.code && <p className="text-sm text-destructive">{formState.errors.code.message}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="b-city">City</Label>
              <Input id="b-city" {...register('city')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-phone">Phone</Label>
              <Input id="b-phone" type="tel" {...register('phone')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-address">Address</Label>
            <Input id="b-address" {...register('address')} />
          </div>
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />
                Active (shown in the app)
              </label>
            )}
          />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="branch-form" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
