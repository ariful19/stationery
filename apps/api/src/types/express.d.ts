import type { Logger } from '../utils/logger.js';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      actor?: string;
      log?: Logger;
    }
  }
}

export {};
