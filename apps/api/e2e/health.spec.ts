import { test, expect } from '@playwright/test';

test('health endpoint reports ok', async ({ request }) => {
  const response = await request.get('health');
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.status).toBe('ok');
});
