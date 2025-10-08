import express from 'express';
import swaggerUi from 'swagger-ui-express';

import { createOpenApiDocument } from './docs/openapi.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { apiRouter } from './routes/index.js';

export function createServer() {
  const app = express();

  app.use(express.json());
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
