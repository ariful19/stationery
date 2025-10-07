import { createServer } from './server.js';

const PORT = Number.parseInt(process.env.PORT ?? '8080', 10);

const app = createServer();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Stationery API ready on http://localhost:${PORT}`);
});
