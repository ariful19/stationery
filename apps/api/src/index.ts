import { createServer } from './server.js';
import { logger } from './utils/logger.js';

const PORT = Number.parseInt(process.env.PORT ?? '8080', 10);

const app = createServer();

app.listen(PORT, '0.0.0.0', () => {
  logger.info({ port: PORT }, 'Stationery API ready');
});
