import type { Request, Response } from 'express';
import * as service from './users.service.js';

export async function create(req: Request, res: Response) {
  res.status(201).json(await service.createUser(req.user!, req.body));
}

export async function updateRole(req: Request<{ id: string }>, res: Response) {
  await service.updateRole(req.params.id, req.body.role);
  res.status(204).end();
}

export async function updateStatus(req: Request<{ id: string }>, res: Response) {
  await service.updateStatus(req.user!, req.params.id, req.body.is_active);
  res.status(204).end();
}

export async function setBranches(req: Request<{ id: string }>, res: Response) {
  await service.setBranches(req.params.id, req.body.branch_ids, req.body.primary_branch_id);
  res.status(204).end();
}
