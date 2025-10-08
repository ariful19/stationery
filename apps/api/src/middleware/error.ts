import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { ApiError } from '../errors.js';
import { logger } from '../utils/logger.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, 'not_found', `Route ${req.method} ${req.originalUrl} was not found`));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestLogger = req.log ?? logger;

  if (err instanceof ZodError) {
    requestLogger.warn({ issues: err.issues }, 'validation error');
    res.status(400).json({
      code: 'validation_error',
      message: 'Request validation failed',
      details: err.flatten(),
      requestId: req.requestId,
    });
    return;
  }

  if (err instanceof ApiError) {
    if (err.status >= 500) {
      requestLogger.error({ code: err.code, details: err.details }, 'api error');
    } else {
      requestLogger.warn({ code: err.code, details: err.details }, 'api error');
    }
    res.status(err.status).json({
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
      requestId: req.requestId,
    });
    return;
  }

  if (err instanceof Error) {
    requestLogger.error({ name: err.name, message: err.message }, 'unhandled error');
  } else {
    requestLogger.error({ err }, 'unhandled error');
  }
  res.status(500).json({
    code: 'internal_error',
    message: 'An unexpected error occurred',
    requestId: req.requestId,
  });
}
