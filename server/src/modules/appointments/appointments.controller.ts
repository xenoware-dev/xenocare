import type { Request, Response } from 'express';
import * as service from './appointments.service.js';

export async function createRecurring(req: Request, res: Response) {
  res.status(201).json(await service.createRecurring(req.db!, req.user!, req.body));
}

export async function cancelSeries(req: Request<{ groupId: string }>, res: Response) {
  res.json(await service.cancelSeries(req.db!, req.user!, req.params.groupId, req.body?.reason));
}
