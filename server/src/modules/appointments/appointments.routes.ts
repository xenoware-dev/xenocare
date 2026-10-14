import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import * as controller from './appointments.controller.js';
import { createRecurringSchema } from './appointments.schema.js';

// Single appointments are created directly from React (RLS + exclusion constraints).
// The server handles operations that touch many rows.
export const appointmentsRouter = Router();
appointmentsRouter.use(authenticate, requireRole('admin'));

appointmentsRouter.post('/recurring', validateBody(createRecurringSchema), controller.createRecurring);
appointmentsRouter.post('/recurring/:groupId/cancel', controller.cancelSeries);
