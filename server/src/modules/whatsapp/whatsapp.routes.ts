import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import * as controller from './whatsapp.controller.js';
import { sendToParentsSchema } from './whatsapp.schema.js';

export const whatsappRouter = Router();

// Public: called by Meta
whatsappRouter.get('/webhook', controller.verifyWebhook);
whatsappRouter.post('/webhook', controller.receiveWebhook);

// Staff
whatsappRouter.post('/send', authenticate, requireRole('owner', 'admin'), validateBody(sendToParentsSchema), controller.sendToParents);
whatsappRouter.post('/queue/process', authenticate, requireRole('owner'), controller.processQueue);
