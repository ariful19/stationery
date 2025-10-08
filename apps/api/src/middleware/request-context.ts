import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';

import { logger } from '../utils/logger.js';

export const requestContext = (): RequestHandler => {
  return (req, res, next) => {
    const requestId = (req.header('x-request-id') ?? '').trim() || randomUUID();
    const actor = (req.header('x-actor-id') ?? '').trim() || 'anonymous';
    const start = process.hrtime.bigint();

    res.setHeader('X-Request-Id', requestId);

    req.requestId = requestId;
    req.actor = actor;

    const requestLogger = logger.child({
      requestId,
      actor,
      method: req.method,
      path: req.originalUrl,
    });

    req.log = requestLogger;

    requestLogger.info(
      {
        userAgent: req.get('user-agent'),
        referer: req.get('referer'),
      },
      'request.started',
    );

    let completed = false;

    const logCompletion = (event: 'finish' | 'close') => {
      if (completed) return;
      completed = true;
      const durationNs = process.hrtime.bigint() - start;
      const durationMs = Number(durationNs) / 1_000_000;
      requestLogger.info(
        {
          status: res.statusCode,
          durationMs: Number(durationMs.toFixed(2)),
          event,
        },
        'request.completed',
      );
    };

    res.on('finish', () => logCompletion('finish'));
    res.on('close', () => logCompletion('close'));

    next();
  };
};
