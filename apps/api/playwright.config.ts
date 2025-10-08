import { defineConfig } from '@playwright/test';
import { join } from 'node:path';

const databaseUrl = process.env.PLAYWRIGHT_DATABASE_URL ?? join(process.cwd(), 'tmp', 'playwright-api.sqlite');
process.env.DATABASE_URL = databaseUrl;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: '../../playwright-report/api' }]
  ],
  use: {
    baseURL: 'http://127.0.0.1:8080/api/v1/',
    extraHTTPHeaders: { 'content-type': 'application/json' }
  },
  webServer: {
    command: 'pnpm run start:e2e',
    env: {
      DATABASE_URL: databaseUrl,
      MOCK_INVOICE_PDF: 'true',
      MOCK_REPORT_PDF: 'true',
      PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH
    },
    port: 8080,
    reuseExistingServer: false,
    timeout: 120 * 1000
  }
});
