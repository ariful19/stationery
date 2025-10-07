import { test, expect } from '@playwright/test';

test('renders the Stationery landing page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Stationery HQ' })).toBeVisible();
});
