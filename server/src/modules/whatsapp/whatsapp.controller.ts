import type { Request, Response } from 'express';
import { env } from '../../config/env.js';
import { AppError, unwrap } from '../../utils/AppError.js';
import { verifyWebhookSignature } from './whatsapp.client.js';
import * as service from './whatsapp.service.js';

/** Meta webhook verification handshake. */
export function verifyWebhook(req: Request, res: Response) {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && env.WHATSAPP_VERIFY_TOKEN && token === env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(String(challenge));
  }
  res.sendStatus(403);
}

export async function receiveWebhook(req: Request, res: Response) {
  if (!verifyWebhookSignature(req.rawBody, req.header('x-hub-signature-256'))) {
    return res.sendStatus(401);
  }
  await service.applyStatusWebhook(req.body);
  res.sendStatus(200);
}

export async function sendToParents(req: Request, res: Response) {
  // Read through the user's client: RLS confirms the caller can see this student.
  const student = unwrap(
    await req.db!.from('students').select('id, home_branch_id').eq('id', req.body.student_id).maybeSingle(),
  ) as { id: string; home_branch_id: string } | null;
  if (!student) throw AppError.notFound('Student not found');

  const result = await service.notifyParents({
    branchId: student.home_branch_id,
    studentId: student.id,
    purpose: req.body.purpose,
    variables: req.body.variables,
    relatedType: req.body.related_type,
    relatedId: req.body.related_id,
    sentBy: req.user!.id,
  });
  res.json(result);
}

export async function processQueue(_req: Request, res: Response) {
  res.json({ processed: await service.processQueue() });
}
