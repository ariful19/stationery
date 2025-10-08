import type { Request } from 'express';

import { logger } from './logger.js';

type AuditContext = Record<string, unknown>;

export function recordAuditEvent(req: Request, action: string, context: AuditContext = {}) {
  const requestLogger = req.log ?? logger;
  const entry = {
    type: 'audit',
    action,
    actor: req.actor ?? 'anonymous',
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
    context,
  };

  requestLogger.info(entry, 'audit.event');
}
