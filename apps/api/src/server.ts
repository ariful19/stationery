import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { createOpenApiDocument } from './docs/openapi.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { requestContext } from './middleware/request-context.js';
import { apiRouter } from './routes/index.js';
import { logger } from './utils/logger.js';

export function createServer() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  const allowedOrigins = (process.env.API_ALLOWED_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        logger.warn({ origin }, 'cors.origin.blocked');
        callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Actor-Id'],
      exposedHeaders: ['X-Request-Id', 'X-PDF-Preview-Path'],
      maxAge: 60,
    }),
  );

  app.use(requestContext());
  app.use(express.json({ limit: '1mb' }));
  const openApiDocument = createOpenApiDocument();

  app.get('/docs/openapi.json', (_req, res) => {
    res.json(openApiDocument);
  });
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.get('/', (_req, res) => {
    res.json({ message: 'Stationery API', docs: '/docs' });
  });

  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
