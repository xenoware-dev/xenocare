import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

/** Validates and replaces req.body. Errors are turned into 400s by errorHandler. */
export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}
