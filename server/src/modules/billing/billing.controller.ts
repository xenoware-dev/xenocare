import type { Request, Response } from 'express';
import * as service from './billing.service.js';

export async function remind(req: Request<{ id: string }>, res: Response) {
  res.json(await service.remindInvoice(req.db!, req.params.id, req.user!.id));
}

export async function refresh(req: Request<{ id: string }>, res: Response) {
  res.json(await service.refreshInvoice(req.db!, req.params.id));
}
