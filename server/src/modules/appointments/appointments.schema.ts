import { z } from 'zod';

const isoDate = z.iso.date();

export const createRecurringSchema = z
  .object({
    branch_id: z.uuid(),
    student_id: z.uuid(),
    therapist_id: z.uuid(),
    room_id: z.uuid().optional(),
    therapy_type: z.enum(['speech', 'ot', 'physio', 'other']),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1),   // 0 = Sunday
    start_time: z.string().regex(/^\d{2}:\d{2}$/),
    duration_min: z.number().int().min(10).max(240),
    start_date: isoDate,
    end_date: isoDate,
    notes: z.string().optional(),
  })
  .refine((v) => v.end_date >= v.start_date, { message: 'end_date must be after start_date', path: ['end_date'] })
  .refine((v) => (Date.parse(v.end_date) - Date.parse(v.start_date)) / 86_400_000 <= 366, {
    message: 'A series can be at most one year long',
    path: ['end_date'],
  });

export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;
