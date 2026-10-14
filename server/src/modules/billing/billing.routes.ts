import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import * as controller from './billing.controller.js';

// Invoices, items and payments are created from React (RLS + DB triggers keep totals).
export const billingRouter = Router();
billingRouter.use(authenticate, requireRole('owner', 'admin'));

billingRouter.post('/invoices/:id/remind', controller.remind);
billingRouter.post('/invoices/:id/refresh', controller.refresh);
