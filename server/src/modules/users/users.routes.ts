import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import * as controller from './users.controller.js';
import { createUserSchema, setBranchesSchema, updateRoleSchema, updateStatusSchema } from './users.schema.js';

export const usersRouter = Router();
usersRouter.use(authenticate);

usersRouter.post('/', requireRole('owner', 'admin'), validateBody(createUserSchema), controller.create);
usersRouter.patch('/:id/role', requireRole('owner'), validateBody(updateRoleSchema), controller.updateRole);
usersRouter.patch('/:id/status', requireRole('owner', 'admin'), validateBody(updateStatusSchema), controller.updateStatus);
usersRouter.put('/:id/branches', requireRole('owner'), validateBody(setBranchesSchema), controller.setBranches);
