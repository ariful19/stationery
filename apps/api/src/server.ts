import express from 'express';
import { healthRouter } from './routes/health.js';

export function createServer() {
  const app = express();

  app.use(express.json());
  app.use('/health', healthRouter);

  app.get('/', (_req, res) => {
    res.json({ message: 'Stationery API' });
  });

  return app;
}
