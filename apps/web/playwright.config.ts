import { defineConfig } from '@playwright/test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const apiDatabaseUrl =
  process.env.PLAYWRIGHT_DATABASE_URL ?? join(currentDir, '../api/tmp/playwright-web-e2e.sqlite');

process.env.PLAYWRIGHT_DATABASE_URL = apiDatabaseUrl;

export default defineConfig({
  testDir: './e2e',
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: '../../playwright-report/web' }]
  ],
  globalSetup: '../api/e2e/global-setup.ts',
  use: {
    baseURL: 'http://127.0.0.1:5173'
  },
  webServer: [
    {
      command: 'pnpm --filter @stationery/api run start:e2e',
      env: {
        DATABASE_URL: apiDatabaseUrl,
        MOCK_INVOICE_PDF: 'true',
        MOCK_REPORT_PDF: 'true',
        PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH
      },
      url: 'http://127.0.0.1:8080/api/v1/health',
      reuseExistingServer: false,
      timeout: 120 * 1000
    },
    {
      command: 'pnpm --filter @stationery/web dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000
    }
  ]
});
