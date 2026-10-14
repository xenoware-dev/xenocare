import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import * as controller from './dashboard.controller.js';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate, requireRole('owner', 'admin'));

dashboardRouter.get('/summary', controller.summary);
