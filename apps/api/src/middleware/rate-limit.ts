import rateLimit from 'express-rate-limit';

import { logger } from '../utils/logger.js';

const createHandler = (name: string) =>
  rateLimit({
    windowMs: 60_000,
    max: name === 'pdf' ? 10 : 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const requestLogger = req.log ?? logger;
      requestLogger.warn({ limiter: name }, 'rate.limit.triggered');
      res.status(429).json({
        code: 'rate_limited',
        message: 'Too many requests. Please retry after a short delay.',
        requestId: req.requestId,
      });
    },
    keyGenerator: (req) => `${req.ip}:${req.actor ?? 'anonymous'}`,
  });

export const pdfRateLimiter = createHandler('pdf');
export const searchRateLimiter = createHandler('search');
