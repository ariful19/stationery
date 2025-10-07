import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createServer } from './server.js';

describe('API server', () => {
  it('responds to /health', async () => {
    const app = createServer();
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
