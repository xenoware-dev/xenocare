import { Router } from 'express';
import { appointmentsRouter } from './modules/appointments/appointments.routes.js';
import { billingRouter } from './modules/billing/billing.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { whatsappRouter } from './modules/whatsapp/whatsapp.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/appointments', appointmentsRouter);
apiRouter.use('/billing', billingRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/whatsapp', whatsappRouter);
