import { test, expect } from '@playwright/test';

test('health endpoint reports ok', async ({ request, baseURL }) => {
  const response = await request.get(new URL('/health', baseURL).toString());
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.status).toBe('ok');
});
