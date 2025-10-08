import pino from 'pino';

const level = process.env.LOG_LEVEL ?? 'info';

export const logger = pino({
  level,
  base: {
    service: 'stationery-api',
    environment: process.env.NODE_ENV ?? 'development',
  },
  redact: {
    paths: ['req.headers.authorization'],
    remove: true,
  },
});

export type Logger = typeof logger;
