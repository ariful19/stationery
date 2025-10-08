import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { ApiError } from '../errors.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, 'not_found', `Route ${req.method} ${req.originalUrl} was not found`));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      code: 'validation_error',
      message: 'Request validation failed',
      details: err.flatten(),
    });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.status).json({
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    code: 'internal_error',
    message: 'An unexpected error occurred',
  });
}
