import { z } from 'zod';

export const sendToParentsSchema = z.object({
  student_id: z.uuid(),
  purpose: z.enum(['appointment_reminder', 'appointment_change', 'payment_reminder', 'absence_notice', 'report_ready', 'general']),
  variables: z.record(z.string(), z.string()).default({}),
  related_type: z.enum(['appointment', 'invoice', 'progress_report', 'attendance', 'other']).optional(),
  related_id: z.uuid().optional(),
});
