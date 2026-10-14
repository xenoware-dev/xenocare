import type { NextFunction, Request, Response } from 'express';
import { ZodError, z } from 'zod';
import { isProd } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { AppError } from '../utils/AppError.js';

// Postgres error codes surfaced by Supabase
const PG_ERRORS: Record<string, { status: number; message: string }> = {
  '23P01': { status: 409, message: 'This time slot is already booked' },
  '23505': { status: 409, message: 'A record with these details already exists' },
  '23503': { status: 409, message: 'Referenced record does not exist or is in use' },
  '42501': { status: 403, message: 'You do not have permission for this action' },
  P0001: { status: 400, message: 'Request rejected by the database' },
};

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(AppError.notFound('Route not found'));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { message: err.message, code: err.code, details: err.details } });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: { message: 'Validation failed', code: 'validation', details: z.flattenError(err) } });
  }
  const pgCode = (err as { code?: string })?.code;
  if (pgCode && PG_ERRORS[pgCode]) {
    const { status, message } = PG_ERRORS[pgCode];
    const dbMessage = (err as { message?: string }).message;
    return res.status(status).json({ error: { message: pgCode === 'P0001' && dbMessage ? dbMessage : message, code: pgCode } });
  }

  logger.error({ err, path: req.path }, 'Unhandled error');
  res.status(500).json({
    error: { message: isProd ? 'Internal server error' : String((err as Error)?.message ?? err) },
  });
}
