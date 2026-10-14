import type { Request, Response } from 'express';
import { z } from 'zod';
import * as service from './dashboard.service.js';

const querySchema = z.object({
  branch_id: z.uuid().optional(),
  months: z.coerce.number().int().min(1).max(24).default(6),
});

export async function summary(req: Request, res: Response) {
  const q = querySchema.parse(req.query);
  res.json(await service.getSummary(req.db!, { branchId: q.branch_id, months: q.months }));
}
